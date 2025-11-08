import { resumes } from "~/constants";
import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/putter";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream" },
  ];
}

export default function Home() {
  const { auth} = usePuterStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate("/auth?next=/");
    }
  }, [auth.isAuthenticated, navigate]);

  return <main className="responsive-bg bg-cover">
    <Navbar/>
    {/* {window.puter.ai.chat()} */}
    <section className="main-section">
      <div className="page-heading py-8 md:py-16">
        <h1>Track your Applications & Resume Ratings</h1>
        <h2>Review your submissions and check AI-powered feedback.</h2>
      </div>
    

    {resumes.length > 0 &&(
    <div className="resumes-section">

    {resumes.map((resume) => (
      <ResumeCard key={resume.id} resume={resume} />
    ))}
    </div>
    )}
    </section>
  </main>
}
