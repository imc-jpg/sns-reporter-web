import { redirect } from "next/navigation";

export default function Home() {
  // 로그인 없이 대시보드로 바로 이동합니다. (초기 화면)
  redirect("/dashboard");
}
