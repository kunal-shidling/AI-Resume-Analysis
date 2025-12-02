import React, { useState, useEffect, type FormEvent } from 'react';
import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/putter';
import { generateUUID } from '~/lib/utils';
import { convertPdfToImage } from '~/lib/pdf2img';
import { useNavigate } from 'react-router';
import { prepareInstructions } from '~/constants';

// Smart fallback analysis when AI is unavailable
const generateSmartFallback = (resumeText: string, jobTitle: string, jobDescription: string) => {
    const text = resumeText.toLowerCase();
    
    // Calculate scores based on content analysis
    const hasEmail = /email|@/.test(text);
    const hasPhone = /phone|tel|\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text);
    const hasExperience = /experience|work|employment|position/.test(text);
    const hasEducation = /education|degree|university|college/.test(text);
    const hasSkills = /skills|proficient|expertise/.test(text);
    const wordCount = resumeText.split(/\s+/).length;
    
    const atsScore = (hasEmail ? 20 : 0) + (hasPhone ? 20 : 0) + (hasExperience ? 20 : 0) + 
                     (hasEducation ? 20 : 0) + (hasSkills ? 20 : 0);
    
    const contentScore = Math.min(100, Math.floor((wordCount / 300) * 100));
    const structureScore = (hasExperience && hasEducation && hasSkills) ? 85 : 65;
    
    return {
        overallScore: Math.floor((atsScore + contentScore + structureScore) / 3),
        ATS: {
            score: atsScore,
            tips: [
                { type: hasEmail ? "good" : "improve", tip: hasEmail ? "Contact information present" : "Add email address" },
                { type: hasPhone ? "good" : "improve", tip: hasPhone ? "Phone number included" : "Include phone number" },
                { type: hasSkills ? "good" : "improve", tip: hasSkills ? "Skills section found" : "Add a skills section" }
            ]
        },
        toneAndStyle: {
            score: 75,
            tips: [
                { type: "good", tip: "Professional format", explanation: "Resume follows standard formatting" },
                { type: "improve", tip: "Use action verbs", explanation: "Start bullet points with strong action verbs" },
                { type: "improve", tip: "Quantify achievements", explanation: "Add numbers and metrics to showcase impact" }
            ]
        },
        content: {
            score: contentScore,
            tips: [
                { type: wordCount > 200 ? "good" : "improve", tip: wordCount > 200 ? "Good content length" : "Add more detail", explanation: wordCount > 200 ? "Resume has sufficient content" : "Expand on your experiences and achievements" },
                { type: "improve", tip: "Tailor to job", explanation: `Align content with ${jobTitle} requirements` },
                { type: hasExperience ? "good" : "improve", tip: hasExperience ? "Experience section present" : "Add work experience", explanation: hasExperience ? "Work history is included" : "Include relevant work experience" }
            ]
        },
        structure: {
            score: structureScore,
            tips: [
                { type: hasEducation ? "good" : "improve", tip: hasEducation ? "Education included" : "Add education section", explanation: hasEducation ? "Educational background present" : "Include your education credentials" },
                { type: "improve", tip: "Clear sections", explanation: "Use clear headers for each section" },
                { type: "good", tip: "Organized layout", explanation: "Information is well-structured" }
            ]
        },
        skills: {
            score: hasSkills ? 80 : 50,
            tips: [
                { type: hasSkills ? "good" : "improve", tip: hasSkills ? "Skills listed" : "Add skills section", explanation: hasSkills ? "Technical skills are present" : "List relevant technical and soft skills" },
                { type: "improve", tip: "Match job requirements", explanation: `Include skills relevant to ${jobTitle}` },
                { type: "improve", tip: "Categorize skills", explanation: "Group skills by category (technical, soft skills, tools)" }
            ]
        }
    };
};

const Upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const { fs, ai, auth, isLoading, kv, puterReady } = usePuterStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate('/auth?next=/upload');
        }
    }, [isLoading, auth.isAuthenticated, navigate]);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        if (!auth.isAuthenticated) {
            setStatusText('Please sign in to upload files');
            await auth.signIn();
            return;
        }

        if (!puterReady) {
            setStatusText('System not ready. Please wait...');
            return;
        }

        setIsProcessing(true);

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);

            if (!uploadedFile) {
                setStatusText('Error: Failed to upload file');
                setIsProcessing(false);
                return;
            }

            console.log('Uploaded file:', uploadedFile);

            setStatusText('Converting PDF to image...');
            const imageResult = await convertPdfToImage(file);

            if (imageResult.error) {
                setStatusText(`Error: ${imageResult.error}`);
                setIsProcessing(false);
                return;
            }

            const uploadedImage = await fs.upload([imageResult.file!]);

            if (!uploadedImage) {
                setStatusText('Error: Failed to upload image');
                setIsProcessing(false);
                return;
            }

            const uuid = generateUUID();
            const resumePath = uploadedFile.path;
            const imagePath = uploadedImage.path;

            console.log('Resume path:', resumePath);
            console.log('Image path:', imagePath);

            const data = {
                id: uuid,
                resumePath,
                imagePath,
                companyName,
                jobTitle,
                jobDescription,
                feedback: null as any
            };

            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Extracting text from resume...');
            let resumeText = '';

            try {
                console.log('Running OCR...');
                resumeText = await ai.img2txt(imageResult.file!) || '';
                console.log('OCR length:', resumeText.length);
                console.log('Preview:', resumeText.substring(0, 200));

                if (resumeText.length < 50) {
                    throw new Error("Could not extract enough text from resume");
                }
            } catch (ocrError: any) {
                console.error('OCR failed:', ocrError);
                setStatusText('Could not read resume - analysis unavailable');
                data.feedback = generateSmartFallback(resumeText, jobTitle, jobDescription);
                await kv.set(`resume:${uuid}`, JSON.stringify(data));
                setTimeout(() => navigate(`/resume/${uuid}`), 1500);
                return;
            }

            // Try AI analysis first
            setStatusText('Analyzing resume with AI...');
            
            try {
                const prompt = prepareInstructions({ jobTitle, jobDescription, resumeText });

                const feedback = await ai.chat(
                    [
                        {
                            role: "user",
                            content: [{ type: "text", text: prompt }]
                        }
                    ]
                ) as any;

                console.log("### AI RESPONSE:", feedback);

                if (feedback && feedback.message && feedback.message.content) {
                    const content = feedback.message.content;
                    const feedbackText = typeof content === 'string' 
                        ? content 
                        : (content[0]?.text || JSON.stringify(content));

                    console.log("AI Response Text:", feedbackText);

                    let cleanedText = feedbackText.trim();
                    if (cleanedText.startsWith("```")) {
                        cleanedText = cleanedText.replace(/```json|```/g, '').trim();
                    }

                    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        cleanedText = jsonMatch[0];
                    }

                    try {
                        data.feedback = JSON.parse(cleanedText);
                        console.log("✅ AI analysis successful:", data.feedback);
                        await kv.set(`resume:${uuid}`, JSON.stringify(data));
                        setStatusText('Analysis completed, redirecting...');
                        navigate(`/resume/${uuid}`);
                        return;
                    } catch (parseError) {
                        console.warn("JSON parsing failed, using smart fallback");
                    }
                }
            } catch (err: any) {
                console.warn("AI unavailable:", err);
            }

            // AI failed - use smart fallback analysis
            console.log("Using smart fallback analysis");
            setStatusText('Using built-in analysis...');
            data.feedback = generateSmartFallback(resumeText, jobTitle, jobDescription);
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis completed, redirecting...');
            navigate(`/resume/${uuid}`);

        } catch (error: any) {
            console.error("Upload error:", error);
            setStatusText(`Error: ${error.message || "Unexpected error"}`);
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (!form || !file) return;

        const formData = new FormData(form);

        await handleAnalyze({
            companyName: formData.get('company-name') as string,
            jobTitle: formData.get('job-title') as string,
            jobDescription: formData.get('job-description') as string,
            file
        });
    };

    return (
        <main className="responsive-bg bg-cover">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Get Smart Resume Feedback</h1>

                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for ATS score + improvement tips</h2>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" />
                            </div>

                            <div className="form-div">
                                <label>Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
