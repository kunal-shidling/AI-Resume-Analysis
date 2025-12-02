import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { usePuterStore } from "~/lib/putter";

import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
  { title: "Resumind | Review" },
  { name: "description", content: "Detailed overview of your resume" },
]);

const Resume = () => {
  const { auth, isLoading, fs, kv, puterReady } = usePuterStore();
  const { id } = useParams();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Redirection path corrected
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading, auth.isAuthenticated, navigate, id]);

  // Load resume and feedback
  useEffect(() => {
    if (!puterReady) return;

    const loadResume = async () => {
      try {
        const resume = await kv.get(`resume:${id}`);
        if (!resume) {
          console.warn('No resume found for id:', id);
          return;
        }

        const data = JSON.parse(resume);
        console.log('Resume data loaded:', data);

        // PDF Blob
        const resumeBlob = await fs.read(data.resumePath);
        if (!resumeBlob) {
          console.error('Failed to read resume blob');
          return;
        }

        const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setResumeUrl(pdfUrl);
        console.log('PDF URL created:', pdfUrl);

        // Image preview if available
        if (data.imagePath) {
          const imgBlob = await fs.read(data.imagePath);
          if (imgBlob) {
            const imgUrl = URL.createObjectURL(imgBlob);
            setImageUrl(imgUrl);
            console.log('Image URL created:', imgUrl);
          }
        }

        setFeedback(data.feedback);
      } catch (error) {
        console.error("Error loading resume:", error);
      }
    };

    loadResume();
  }, [id, puterReady, fs, kv]);

  // Wait for puter to load before rendering
  if (!puterReady) {
    return <p className="text-center p-10">Loading environment...</p>;
  }

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <a href="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </a>
      </nav>

      <div className="flex w-full h-screen overflow-hidden">

        {/* LEFT SIDE — PREVIEW */}
        <section
          className="
            w-1/2
            h-screen
            sticky top-0
            flex items-center justify-center
            bg-[url('/images/bg-small.svg')]
            bg-cover
            px-4
          "
        >
          <div className="w-full max-w-[600px] mx-auto">
            {resumeUrl ? (
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">

                {imageUrl ? (
                  <img
                    src={imageUrl}
                    className="w-full rounded-2xl object-contain"
                    alt="resume preview"
                  />
                ) : (
                  <iframe
                    src={resumeUrl}
                    className="w-full h-[90vh] rounded-2xl"
                    title="resume"
                  />
                )}

              </a>
            ) : (
              <p className="text-center text-gray-500">Loading resume...</p>
            )}
          </div>
        </section>

        {/* RIGHT SIDE — FEEDBACK */}
        <section
          className="
            w-1/2
            h-screen
            overflow-y-scroll
            px-6 py-10
          "
        >
          <h2 className="text-4xl font-bold text-black">Resume Review</h2>

          {feedback ? (
            <div className="flex flex-col gap-8">
              <Summary feedback={feedback} />
              <ATS
                score={feedback.ATS?.score || 0}
                suggestions={feedback.ATS?.tips || []}
              />
              <Details feedback={feedback} />
            </div>
          ) : (
            <img src="/images/resume-scan-2.gif" alt="" className="w-full" />
          )}
        </section>

      </div>
    </main>
  );
};

export default Resume;
