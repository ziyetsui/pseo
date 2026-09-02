import { redirect } from 'next/navigation'

export default function CmsRootPage(): never {
  redirect('/admin')
}
