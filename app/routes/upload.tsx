import React, { useState, type FormEvent } from 'react'
import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar'
import { usePuterStore } from '~/lib/putter'
import { generateUUID } from '~/lib/utils';
import { convertPdfToImage } from '~/lib/pdf2img';
import { useNavigate } from 'react-router';
import { prepareInstructions } from '~/constants';

const Upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file,setFile] = useState<File | null>(null);
    const { fs, ai,auth, isLoading, kv } = usePuterStore();
    const navigate = useNavigate();

    const handleFileSelect = (file:File |null)=>{
        setFile(file)
    }

    const handleAnalyze = async({companyName, jobTitle, jobDescription, file }: {companyName:string, jobTitle:string, jobDescription:string, file:File}) => {
        setIsProcessing(true);
        setStatusText('Uploading the file...');
        const uploadedFile = await fs.upload([file]);

        if(!uploadedFile) return setStatusText('Error: Failed to upload file');

        setStatusText('Converting PDF to image...');
        const imageResult = await convertPdfToImage(file);
        if (imageResult.error) {
            setStatusText(`Error: ${imageResult.error}`);
            return;
        }

        const uploadedImage = await fs.upload([imageResult.file!]);
        if (!uploadedImage) return setStatusText('Error: Failed to upload image');

        setStatusText('Preparing data...');

        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName,
            jobTitle,
            jobDescription,
            feedback: null as any,
        }
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analyzing...');

        let feedback;
        try {
            feedback = await ai.feedback(
                uploadedFile.path,
                 prepareInstructions({ jobTitle, jobDescription})
            )
            if(!feedback) return setStatusText('Error: Failed to analyze resume');

            // Check if the response contains an error
            if (typeof feedback === 'object' && 'error' in feedback && feedback.error) {
                setStatusText(`Error: ${feedback.error} - proceeding with basic analysis...`);
                // Proceed with empty feedback for now
                data.feedback = { score: 0, suggestions: ['AI service temporarily unavailable'] };
                await kv.set(`resume:${uuid}`, JSON.stringify(data));
                setStatusText('Analysis completed, redirecting...');
                navigate(`/resume/${uuid}`);
                return;
            }
        } catch (error: any) {
            setStatusText(`Error: ${error.error || 'Failed to analyze resume'} - proceeding with basic analysis...`);
            // Proceed with empty feedback for now
            data.feedback = { score: 0, suggestions: ['AI service temporarily unavailable'] };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis completed, redirecting...');
            navigate(`/resume/${uuid}`);
            return;
        }

        const feedbackText = typeof feedback.message.content === 'string' ?
        feedback.message.content : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        

        setStatusText('Analysis completed, redirecting...');
        console.log(data);
        navigate(`/resume/${uuid}`);

    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) =>{
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return ;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file || !companyName || !jobTitle || !jobDescription) return;

        await handleAnalyze({companyName,jobTitle, jobDescription, file});

    }
  return (
    <main className="responsive-bg bg-cover">
        <Navbar/>

        <section className="main-section">
           <div className="page-heading py-16">
                <h1>Get A Smart feedback for your dream job.</h1>
                {isProcessing ? (
                    <>
                        <h2>{statusText}</h2>
                        <img src="/images/resume-scan.gif" className='w-full' />
                    </>
                ):(
                    <h2>Drop your resume for an ATS score and help for improvement tips</h2>
                )}
                {!isProcessing && (
                    <form id="upload-form" onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                        <div className="form-div">
                            <label htmlFor="company-name">Company Name</label>
                            <input type="text" name='company-name' placeholder='Company Name' id='company-name' />
                        </div>

                        <div className="form-div">
                            <label htmlFor="job-title">Job Title</label>
                            <input type="text" name='job-title' placeholder='Job Title' id='job-title' />
                        </div>

                        <div className="form-div">
                            <label htmlFor="job-description">Job Description</label>
                            <textarea rows={5} name='job-description' placeholder='Job Description' id='job-description' />
                        </div>

                        <div className="form-div">
                            <label htmlFor="uploader">Upload Resume</label>
                            <FileUploader onFileSelect={handleFileSelect}/>
                        </div>

                        <button className='primary-button' type='submit'>
                            Analyze Resume
                        </button>

                    </form>
                )}
            </div> 
        </section> 
    </main>
    
    )
}

export default Upload

