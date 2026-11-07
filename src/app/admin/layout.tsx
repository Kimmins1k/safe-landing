import Link from "next/link";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-navy-100 pb-3 text-sm font-bold">
        <Link href="/admin/approvals" className="text-navy-700 hover:text-safety-600">
          가입 승인
        </Link>
        <Link href="/admin/members" className="text-navy-700 hover:text-safety-600">
          회원 관리
        </Link>
        <Link href="/admin/activities" className="text-navy-700 hover:text-safety-600">
          활동 관리
        </Link>
        <Link href="/" className="ml-auto text-navy-700 hover:text-safety-600">
          홈으로
        </Link>
      </nav>
      {children}
    </div>
  );
}
