/* eslint-disable @next/next/no-img-element */
"use client";
import {useEffect,useState} from "react";

const slides=[
 {image:"/media/ja-career-fair.jpg",eyebrow:"成长活动",title:"未来职业市集：把职业探索带到真实现场",meta:"青年与企业面对面 · 活动报名",href:"/workspace?role=student&tab=activities"},
 {image:"/media/ja-student-company.jpg",eyebrow:"学生公司",title:"20+ 学生公司，一起把想法变成行动",meta:"创新实践 · 团队协作",href:"/content"},
 {image:"/media/ja-competition.jpg",eyebrow:"活动回顾",title:"JA 中国学生公司地区赛：让成果被看见",meta:"成长故事 · 精彩回顾",href:"/content"},
 {image:"/media/ja-student-project.jpg",eyebrow:"项目故事",title:"从校园问题出发，完成一次真实项目",meta:"青年行动 · 项目作品",href:"/content"},
];

export default function HomeCarousel(){
 const [active,setActive]=useState(0),[paused,setPaused]=useState(false);
 useEffect(()=>{if(paused)return;const timer=window.setInterval(()=>setActive(v=>(v+1)%slides.length),4800);return()=>window.clearInterval(timer)},[paused]);
 const move=(delta:number)=>setActive(v=>(v+delta+slides.length)%slides.length);
 return <section className="story-stage shell" aria-label="JA 活动与成长内容轮播" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
  <div className="story-heading"><div><p className="eyebrow">LIVE STORIES</p><h2>正在发生的成长故事</h2></div><p>图片是活动与内容的入口。左右切换，点击封面即可进入报名或阅读。</p></div>
  <div className="story-viewport">
   <div className="story-track" style={{transform:`translateX(-${active*100}%)`}}>{slides.map((slide,index)=><a className="story-slide" href={slide.href} key={slide.image} aria-hidden={active!==index} tabIndex={active===index?0:-1}><img src={slide.image} alt={slide.title}/><div className="story-shade"/><span className="story-number">0{index+1}</span><div className="story-caption"><small>{slide.eyebrow}</small><h3>{slide.title}</h3><p>{slide.meta}</p><b>打开内容 <i>↗</i></b></div></a>)}</div>
   <div className="story-controls"><button onClick={()=>move(-1)} aria-label="上一张">←</button><div>{slides.map((_,index)=><button key={index} className={active===index?"active":""} onClick={()=>setActive(index)} aria-label={`查看第 ${index+1} 张`}/>)}</div><button onClick={()=>move(1)} aria-label="下一张">→</button></div>
  </div>
 </section>
}
