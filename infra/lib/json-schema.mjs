import { isDeepStrictEqual } from 'node:util'

const supportedFormats = new Set(['date', 'date-time', 'uri'])

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

function valueType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

function matchesType(value, expected) {
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (expected === 'integer') return Number.isInteger(value)
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (expected === 'array') return Array.isArray(value)
  if (expected === 'null') return value === null
  return typeof value === expected
}

function resolveReference(rootSchema, reference) {
  if (!reference.startsWith('#/')) throw new Error(`Only local JSON Schema references are supported: ${reference}`)
  let current = rootSchema
  for (const token of reference.slice(2).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
    current = current?.[key]
  }
  if (!current || typeof current !== 'object') throw new Error(`Unresolvable JSON Schema reference: ${reference}`)
  return current
}

function validFormat(format, value) {
  if (!supportedFormats.has(format)) throw new Error(`Unsupported JSON Schema format: ${format}`)
  if (format === 'uri') {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }
  if (format === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}

export function validateJsonSchema(schema, value) {
  const errors = []

  function add(path, keyword, message) {
    errors.push({ path, keyword, message })
  }

  function visit(node, candidate, currentPath) {
    if (node.$ref) return visit(resolveReference(schema, node.$ref), candidate, currentPath)

    if (Object.hasOwn(node, 'const') && !isDeepStrictEqual(candidate, node.const)) {
      add(currentPath, 'const', `must equal ${JSON.stringify(node.const)}`)
    }
    if (node.enum && !node.enum.some((item) => isDeepStrictEqual(item, candidate))) {
      add(currentPath, 'enum', `must be one of ${node.enum.map((item) => JSON.stringify(item)).join(', ')}`)
    }

    if (node.type) {
      const expected = Array.isArray(node.type) ? node.type : [node.type]
      if (!expected.some((type) => matchesType(candidate, type))) {
        add(currentPath, 'type', `must be ${expected.join(' or ')}, got ${valueType(candidate)}`)
        return
      }
    }

    if (typeof candidate === 'string') {
      const length = [...candidate].length
      if (node.minLength !== undefined && length < node.minLength) {
        add(currentPath, 'minLength', `must contain at least ${node.minLength} characters`)
      }
      if (node.maxLength !== undefined && length > node.maxLength) {
        add(currentPath, 'maxLength', `must contain at most ${node.maxLength} characters`)
      }
      if (node.pattern && !new RegExp(node.pattern, 'u').test(candidate)) {
        add(currentPath, 'pattern', `must match ${node.pattern}`)
      }
      if (node.format && !validFormat(node.format, candidate)) {
        add(currentPath, 'format', `must be a valid ${node.format}`)
      }
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      if (node.minimum !== undefined && candidate < node.minimum) {
        add(currentPath, 'minimum', `must be at least ${node.minimum}`)
      }
      if (node.maximum !== undefined && candidate > node.maximum) {
        add(currentPath, 'maximum', `must be at most ${node.maximum}`)
      }
    }

    if (Array.isArray(candidate)) {
      if (node.minItems !== undefined && candidate.length < node.minItems) {
        add(currentPath, 'minItems', `must contain at least ${node.minItems} items`)
      }
      if (node.maxItems !== undefined && candidate.length > node.maxItems) {
        add(currentPath, 'maxItems', `must contain at most ${node.maxItems} items`)
      }
      if (node.uniqueItems) {
        const seen = new Set()
        for (const item of candidate) {
          const key = JSON.stringify(canonical(item))
          if (seen.has(key)) add(currentPath, 'uniqueItems', 'must not contain duplicate items')
          seen.add(key)
        }
      }
      if (node.items) candidate.forEach((item, index) => visit(node.items, item, `${currentPath}[${index}]`))
    }

    if (candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const properties = node.properties ?? {}
      for (const required of node.required ?? []) {
        if (!Object.hasOwn(candidate, required)) add(`${currentPath}.${required}`, 'required', 'is required')
      }
      for (const [key, item] of Object.entries(candidate)) {
        if (Object.hasOwn(properties, key)) visit(properties[key], item, `${currentPath}.${key}`)
        else if (node.additionalProperties === false) add(`${currentPath}.${key}`, 'additionalProperties', 'is not allowed')
      }
    }
  }

  visit(schema, value, '$')
  return errors
}
