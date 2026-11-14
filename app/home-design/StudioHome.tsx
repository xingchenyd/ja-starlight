"use client";
import { useEffect, useRef } from "react";
import { homepageMarkup } from "./markup";
import { mountHomepage } from "./motion";
import HomeSections from "../HomeSections";
import "../studio-home.css";
export default function StudioHome() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => { if (root.current) return mountHomepage(root.current); }, []);
  const [opening, closing] = homepageMarkup.split('<!-- ===== journey ===== -->');
  return <main className="studio-home" id="top" ref={root}>
    <div dangerouslySetInnerHTML={{ __html: opening }} />
    <div className="public-home studio-catalog"><form className="studio-search shell" action="/opportunities" role="search"><label htmlFor="home-query">寻找机会</label><input id="home-query" name="q" placeholder="企业、岗位或技能" /><button className="btn btn-gold" type="submit">开始探索 →</button></form><HomeSections /></div>
    <div dangerouslySetInnerHTML={{ __html: closing || "" }} />
  </main>;
}
