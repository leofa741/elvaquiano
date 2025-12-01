import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Cargando búsqueda...</div>}>
      <SearchResults />
    </Suspense>
  );
}
