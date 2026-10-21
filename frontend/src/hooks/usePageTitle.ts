import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ScrumFlow`;
    return () => {
      document.title = "ScrumFlow";
    };
  }, [title]);
}
