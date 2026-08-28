import type { Metadata } from "next";
import { jobs } from "../../data";
import DynamicJobDetail from "./DynamicJobDetail";
import JobDetailView from "./JobDetailView";

function findStaticJob(id: string) {
  return jobs.find((job) => job.id === id) || jobs[Number(id) - 1];
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = findStaticJob(id);
  if (!job) return { title: "机会详情｜JA Star Plan", description: "查看企业发布的实习项目机会。" };
  const title = `${job.company}｜${job.title}`;
  return { title, description: job.summary, openGraph: { title, description: job.summary, images: [] }, twitter: { title, description: job.summary, images: [] } };
}
export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = findStaticJob(id);
  return job ? <JobDetailView job={job} /> : <DynamicJobDetail id={id} />;
}
