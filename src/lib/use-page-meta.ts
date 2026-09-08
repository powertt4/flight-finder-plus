import { useEffect } from "react";

type PageMeta = {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  robots?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(attr: "name" | "property", key: string) {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

// Lightweight per-route document.title / meta-tag management, replacing the
// TanStack Router `head()` route option now that there is no router-level
// head API. Applies on mount and restores robots when the route unmounts.
export function usePageMeta({ title, description, ogTitle, ogDescription, robots }: PageMeta) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", ogTitle ?? title);
    upsertMeta("property", "og:description", ogDescription ?? description);
    if (robots) upsertMeta("name", "robots", robots);
    return () => {
      if (robots) removeMeta("name", "robots");
    };
  }, [title, description, ogTitle, ogDescription, robots]);
}
