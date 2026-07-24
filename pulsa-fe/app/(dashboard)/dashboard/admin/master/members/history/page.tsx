import { Suspense } from "react";
import HistoryClient from "./HistoryClient";

export default function Page() {
  return (
    <Suspense fallback={<div >Loading...</div>}>
      <HistoryClient />
    </Suspense>
  );
}
