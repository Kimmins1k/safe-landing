// 기획서 10장 기준 초안. 개인정보보호위원회 작성지침과 학과·학교 지침을 확인한 뒤 확정한다.
export default function PrivacyPage() {
  return (
    <article className="space-y-6 leading-relaxed">
      <h1 className="text-2xl font-bold">개인정보 처리방침 (초안)</h1>
      <p className="rounded bg-safety-500/10 p-3 text-sm">
        이 문서는 초안입니다. 정식 오픈 전에 문구를 확정합니다.
      </p>

      <section>
        <h2 className="font-bold">1. 수집 항목과 목적</h2>
        <ul className="list-disc pl-5">
          <li>이름, 기수(입학년도), 재학 상태: 동아리원 확인과 가입 승인</li>
          <li>구글 계정 이메일: 로그인과 신청자 구분 (관리자 화면에서만 보임)</li>
          <li>직접 작성한 경험 카드, 자격증 기록, 게시글: 서비스 제공</li>
        </ul>
      </section>

      <section>
        <h2 className="font-bold">2. 보관 기간과 파기</h2>
        <p>
          탈퇴할 때까지 보관합니다. 탈퇴하면 다음과 같이 처리합니다.
        </p>
        <ul className="list-disc pl-5">
          <li>이름, 기수, 재학 상태, 구글 이메일, 자격증·교육 기록: 바로 삭제합니다.</li>
          <li>비공개 경험 카드와 임시 저장 경험 카드: 바로 삭제합니다.</li>
          <li>
            동아리원 공개로 완성한 경험 카드: 후배들의 취업 준비 자료로 계속 쓰도록 작성자 정보(이름·기수)를 지우고
            &quot;탈퇴한 회원&quot;으로 남깁니다. 남기고 싶지 않은 카드는 탈퇴 전에 비공개로 바꾸거나 삭제할 수 있습니다.
          </li>
          <li>게시글·댓글: 탈퇴할 때 본인이 선택한 대로 삭제하거나 &quot;탈퇴한 회원&quot;으로 남깁니다.</li>
          <li>임원진이 회원을 내보낸 경우에도 위와 같이 처리합니다.</li>
        </ul>
        <p>가입이 거절되면 입력한 정보를 바로 삭제합니다.</p>
      </section>

      <section>
        <h2 className="font-bold">3. 처리를 맡기는 곳과 국외 이전</h2>
        <ul className="list-disc pl-5">
          <li>Supabase Inc.(미국): 로그인·데이터베이스. 데이터는 서울 지역 서버에 저장합니다.</li>
          <li>Vercel Inc.(미국): 웹사이트 서버. 서버 함수는 서울 지역에서 실행합니다.</li>
          <li>이전 항목: 위 1번의 모든 항목 / 시기·방법: 서비스 이용 시 네트워크로 전송</li>
        </ul>
      </section>

      <section>
        <h2 className="font-bold">4. 공개 범위</h2>
        <p>
          모든 정보는 승인된 동아리원에게만 보이며, 경험 카드와 자격증은 기본 비공개입니다. 단, 데이터베이스
          관리 권한을 가진 임원진은 기술적으로 비공개 정보도 볼 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="font-bold">5. 문의</h2>
        <p>동아리 임원진(학회장)에게 문의해 주세요.</p>
      </section>
    </article>
  );
}
