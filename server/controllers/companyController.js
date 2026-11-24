import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from '../models/jobApplications.js'
import InterviewAssignment from '../models/InterviewAssignment.js'
import InterviewSession from '../models/InterviewSession.js'
import User from '../models/User.js'
import { processNewJobAlerts } from "../services/whatsappJobAlertService.js";

// Register a new company
export const registerCompany = async (req,res) => {

    const {name, email , password} = req.body
    
    const imageFile = req.file;
    
    if(!name || !email || !password || !imageFile){
        return res.json({success:false, message:"Missing Details"})
    }

    try {
        const companyExists = await Company.findOne({email})
        if(companyExists) {
            return res.json({success:false, message: 'Company already registered'})
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        const company = await Company.create({
            name,
            email,
            password: hashPassword,
            image: imageUpload.secure_url
        })

        res.json({
            success: true,
            company : {
                _id: company._id,
                name: company.name,
                email: company.image,
                image: company.image
            },
            token: generateToken(company._id)
        })
        
    } catch (error) {
        res.json({success:false, message: error.message})
    }

}

// Company login
export const loginCompany = async (req,res) => {
    const { email, password } = req.body

    try {
        const company = await Company.findOne({email})
        if(await bcrypt.compare(password, company.password)){
            res.json({
                success: true,
                company : {
                    _id: company._id,
                    name: company.name,
                    email: company.email,
                    image: company.image
                },
                token: generateToken(company._id)
            })
        }
        else {
            res.json({success: false, message: "Invalid email or password"})
        }
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Get company data
export const getCompanyData = async (req,res) => {

    const company = req.company

    try {
        
        res.json({success:true, company})

    } catch (error) {
        res.json({
            success:false,
            message:error.message
        })
    }

}

// Post a new job
export const postJob = async (req,res) => {

    const { title, description, location, salary, level, category, skills } = req.body

    const companyId = req.company._id

    try {
        let skillsArray = [];
        if (Array.isArray(skills)) {
            skillsArray = skills;
        } else if (typeof skills === "string" && skills.trim()) {
            skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
        }

        const newJob = new Job({
            title,
            description,
            location,
            salary,
            companyId,
            date: Date.now(),
            level,
            category,
            skills: skillsArray
        })
        await newJob.save()

        // Trigger WhatsApp job alert workflow for newly created job
        processNewJobAlerts(newJob._id).catch((err) => {
            console.error("[PostJob] Error triggering WhatsApp alerts:", err.message);
        });

        res.json({success:true, newJob})
    } catch (error) {
        res.json({success:false, message: error.message})
    }

}

// Get company Job Applicants
export const getCompanyJobApplicants = async (req,res) => {
    try {
        
        const companyId = req.company._id

        // Find job applications for the user and populate related data
        const applications = await JobApplication.find({companyId})
        .populate('userId','name image resume')
        .populate('jobId','title location category level salary')
        .exec()

        return res.json({success:true,applications})

    } catch (error) {
        res.json({success:false, message:error.message})
    }
}

// Get Company Posted Jobs
export const getCompanyPostedJobs = async (req,res) => {
    try {

        const companyId = req.company._id

        const jobs = await Job.find({companyId})

        // (Todo: Adding number of applicants info in data)
        const jobsData = await Promise.all(jobs.map(async (job) => {
            const applicants = await JobApplication.find({jobId: job._id})
            return {...job.toObject(), applicants:applicants.length}
        }))

        res.json({success:true,jobsData})
        
    } catch (error) {
        res.json({success:false, message:error.message})
    }
}

// change job applications status
export const changeJobApplicationsStatus = async (req,res) => {
    try {
        
    const { id, status } = req.body

    // Find Job application and update status
    await JobApplication.findOneAndUpdate({_id:id}, {status})

    res.json({success:true, message:'Status Changes'})

    } catch (error) {
        res.json({success:false, message:error.message})
    }
}

// Change Job Visibility
export const changeVisibility = async (req,res) => {
    try {
        
        const {id} = req.body

        const companyId = req.company._id

        const job = await Job.findById(id)

        if (companyId.toString() === job.companyId.toString()){
            job.visible = !job.visible
        }

        await job.save()

        res.json({success:true, job})

    } catch (error) {
        res.json({success:false, message:error.message})
    }
}

// ================= RECRUITER AI INTERVIEW MANAGEMENT =================

/**
 * Get recruiter's posted jobs with their applicants for interview assignment selection
 */
export const getCompanyJobsWithApplicants = async (req, res) => {
    try {
        const companyId = req.company._id;

        const jobs = await Job.find({ companyId }).sort({ createdAt: -1 });

        const jobsWithApplicants = await Promise.all(
            jobs.map(async (job) => {
                const applications = await JobApplication.find({ jobId: job._id })
                    .populate('userId', 'name email image resume phoneNumber')
                    .sort({ date: -1 });

                // Fetch any active interview assignments for these candidates on this job
                const assignments = await InterviewAssignment.find({
                    companyId,
                    jobId: job._id,
                });

                const assignmentMap = new Map();
                assignments.forEach((a) => {
                    assignmentMap.set(a.candidateId.toString(), a);
                });

                const formattedApplicants = applications
                    .filter((app) => app.userId)
                    .map((app) => {
                        const existingAssignment = assignmentMap.get(app.userId._id.toString());
                        let currentInterviewStatus = app.interviewStatus || 'Not Assigned';
                        if (existingAssignment) {
                            currentInterviewStatus = existingAssignment.getEffectiveStatus();
                        }
                        return {
                            applicationId: app._id,
                            candidateId: app.userId._id,
                            name: app.userId.name,
                            email: app.userId.email,
                            image: app.userId.image,
                            resume: app.userId.resume,
                            phoneNumber: app.userId.phoneNumber || '',
                            applicationStatus: app.status,
                            appliedDate: app.date,
                            interviewStatus: currentInterviewStatus,
                            assignmentId: existingAssignment?._id || null,
                            score: existingAssignment?.score ?? null,
                        };
                    });

                return {
                    jobId: job._id,
                    title: job.title,
                    location: job.location,
                    category: job.category,
                    level: job.level,
                    salary: job.salary,
                    skills: job.skills || [],
                    description: job.description,
                    visible: job.visible,
                    applicants: formattedApplicants,
                };
            })
        );

        return res.json({ success: true, jobs: jobsWithApplicants });
    } catch (error) {
        console.error('Error fetching jobs with applicants:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Assign AI Interview to selected candidates
 * Recruiter selects: job, candidateIds, interviewType, difficulty, duration/questions, skills, customInstructions, deadline
 */
export const assignInterviews = async (req, res) => {
    try {
        const companyId = req.company._id;
        const {
            jobId,
            candidateIds,
            interviewType = 'Technical',
            difficulty = 'Medium',
            durationMinutes = 30,
            questionCount = 5,
            skills = [],
            customInstructions = '',
            deadline,
            candidateReportVisible = true,
        } = req.body;

        if (!jobId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            return res.json({ success: false, message: 'Please select a job and at least one candidate.' });
        }

        if (!deadline) {
            return res.json({ success: false, message: 'Interview deadline is required.' });
        }

        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
            return res.json({ success: false, message: 'Deadline must be a valid future date and time.' });
        }

        // Strict ownership check: Recruiter must own this job posting
        const job = await Job.findOne({ _id: jobId, companyId });
        if (!job) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only assign interviews for your own job postings.',
            });
        }

        const createdAssignments = [];
        const skippedCandidates = [];

        for (const candidateId of candidateIds) {
            // Verify candidate actually applied to this job for this company
            const application = await JobApplication.findOne({
                jobId,
                companyId: companyId.toString(),
                userId: candidateId,
            });

            if (!application) {
                skippedCandidates.push({ candidateId, reason: 'Candidate has not applied to this job posting.' });
                continue;
            }

            // Check if active assignment already exists (ASSIGNED or IN_PROGRESS and not expired)
            const existingActive = await InterviewAssignment.findOne({
                companyId,
                jobId,
                candidateId,
                status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
                deadline: { $gt: new Date() },
            });

            if (existingActive) {
                skippedCandidates.push({
                    candidateId,
                    reason: 'Candidate already has an active pending interview assignment for this job.',
                });
                continue;
            }

            const assignment = await InterviewAssignment.create({
                companyId,
                jobId,
                candidateId,
                applicationId: application._id,
                interviewType,
                difficulty,
                durationMinutes: Number(durationMinutes) || 30,
                questionCount: Number(questionCount) || 5,
                skills: Array.isArray(skills) ? skills : [],
                customInstructions: (customInstructions || '').trim(),
                deadline: deadlineDate,
                candidateReportVisible: Boolean(candidateReportVisible),
                status: 'ASSIGNED',
            });

            // Update application status
            application.interviewStatus = 'Assigned';
            application.interviewAssignmentId = assignment._id;
            await application.save();

            createdAssignments.push(assignment);
        }

        return res.json({
            success: true,
            message: `Successfully assigned AI interview to ${createdAssignments.length} candidate(s).`,
            createdCount: createdAssignments.length,
            skippedCount: skippedCandidates.length,
            assignments: createdAssignments,
            skipped: skippedCandidates,
        });
    } catch (error) {
        console.error('Error assigning interviews:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Get all assigned interviews for recruiter's company
 * Supports filters: jobId, status
 */
export const getCompanyInterviewAssignments = async (req, res) => {
    try {
        const companyId = req.company._id;
        const { jobId, status } = req.query;

        const filter = { companyId };
        if (jobId) {
            filter.jobId = jobId;
        }

        const assignments = await InterviewAssignment.find(filter)
            .populate('jobId', 'title location category level salary')
            .populate('candidateId', 'name email image resume phoneNumber')
            .populate('sessionId', 'overallScore mcqScore mcqTotal subjectiveEvaluation finalReport.hiringRecommendation status createdAt')
            .sort({ createdAt: -1 });

        const now = new Date();
        const formatted = await Promise.all(
            assignments.map(async (a) => {
                let effectiveStatus = a.status;
                // Auto-mark expired if deadline passed and neither completed nor cancelled
                if (
                    ['ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS'].includes(a.status) &&
                    a.deadline &&
                    now > new Date(a.deadline)
                ) {
                    effectiveStatus = 'EXPIRED';
                    if (a.status !== 'EXPIRED') {
                        a.status = 'EXPIRED';
                        await a.save();
                    }
                }

                return {
                    _id: a._id,
                    jobId: a.jobId,
                    candidate: a.candidateId,
                    applicationId: a.applicationId,
                    interviewType: a.interviewType,
                    difficulty: a.difficulty,
                    durationMinutes: a.durationMinutes,
                    questionCount: a.questionCount,
                    skills: a.skills,
                    customInstructions: a.customInstructions,
                    deadline: a.deadline,
                    status: effectiveStatus,
                    allowRetake: a.allowRetake,
                    candidateReportVisible: a.candidateReportVisible !== false,
                    recommendation: a.recommendation || a.sessionId?.finalReport?.hiringRecommendation || '',
                    score: a.score ?? a.sessionId?.overallScore ?? null,
                    startedAt: a.startedAt,
                    completedAt: a.completedAt,
                    createdAt: a.createdAt,
                    sessionId: a.sessionId?._id || a.sessionId || null,
                };
            })
        );

        const filteredResults = status
            ? formatted.filter((item) => item.status.toUpperCase() === status.toUpperCase())
            : formatted;

        return res.json({ success: true, assignments: filteredResults });
    } catch (error) {
        console.error('Error fetching company interview assignments:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Cancel an assigned interview
 */
export const cancelInterviewAssignment = async (req, res) => {
    try {
        const companyId = req.company._id;
        const { assignmentId } = req.body;

        if (!assignmentId) {
            return res.json({ success: false, message: 'Assignment ID is required.' });
        }

        const assignment = await InterviewAssignment.findOne({ _id: assignmentId, companyId });
        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Interview assignment not found or belongs to another recruiter.',
            });
        }

        assignment.status = 'CANCELLED';
        await assignment.save();

        if (assignment.applicationId) {
            await JobApplication.findByIdAndUpdate(assignment.applicationId, {
                interviewStatus: 'Cancelled',
            });
        }

        return res.json({ success: true, message: 'Interview assignment has been cancelled.' });
    } catch (error) {
        console.error('Error cancelling interview assignment:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Allow retake for an assigned interview
 */
export const retakeInterviewAssignment = async (req, res) => {
    try {
        const companyId = req.company._id;
        const { assignmentId, deadline } = req.body;

        if (!assignmentId) {
            return res.json({ success: false, message: 'Assignment ID is required.' });
        }

        const assignment = await InterviewAssignment.findOne({ _id: assignmentId, companyId });
        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Interview assignment not found or belongs to another recruiter.',
            });
        }

        let newDeadline = assignment.deadline;
        if (deadline) {
            const d = new Date(deadline);
            if (!isNaN(d.getTime()) && d > new Date()) {
                newDeadline = d;
            } else {
                return res.json({ success: false, message: 'Retake deadline must be in the future.' });
            }
        } else if (new Date() > new Date(assignment.deadline)) {
            // Default 3 days from now if expired
            newDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }

        assignment.status = 'ASSIGNED';
        assignment.allowRetake = true;
        assignment.deadline = newDeadline;
        assignment.sessionId = null;
        assignment.score = null;
        assignment.startedAt = null;
        assignment.completedAt = null;
        await assignment.save();

        if (assignment.applicationId) {
            await JobApplication.findByIdAndUpdate(assignment.applicationId, {
                interviewStatus: 'Assigned',
            });
        }

        return res.json({
            success: true,
            message: 'Interview retake permitted. Candidate can now take the interview again.',
            assignment,
        });
    } catch (error) {
        console.error('Error allowing interview retake:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Get full interview report for recruiter review
 */
export const getCompanyInterviewSessionReport = async (req, res) => {
    try {
        const companyId = req.company._id;
        const { id } = req.params; // session ID or assignment ID

        let session = await InterviewSession.findOne({ _id: id })
            .populate('userId', 'name email image resume')
            .populate('jobId', 'title location category level');

        let assignment = null;
        if (session) {
            assignment = await InterviewAssignment.findOne({ sessionId: session._id, companyId });
            // Strict verification: Does this session belong to this recruiter?
            if (!assignment && session.companyId?.toString() !== companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized: You do not have permission to view this interview report.',
                });
            }
        } else {
            // Try looking up by assignment ID
            assignment = await InterviewAssignment.findOne({ _id: id, companyId })
                .populate('jobId', 'title location category level')
                .populate('candidateId', 'name email image resume');

            if (!assignment) {
                return res.status(404).json({ success: false, message: 'Interview session or assignment not found.' });
            }

            if (assignment.sessionId) {
                session = await InterviewSession.findById(assignment.sessionId)
                    .populate('userId', 'name email image resume')
                    .populate('jobId', 'title location category level');
            }
        }

        if (!session) {
            return res.json({
                success: true,
                hasSession: false,
                assignment,
                message: 'Candidate has not started this interview session yet.',
            });
        }

        const mcqBreakdown = (session.mcqs || []).map((q, idx) => {
            const selectedOption = session.mcqUserAnswers?.[idx] !== undefined ? session.mcqUserAnswers[idx] : -1;
            return {
                questionNumber: idx + 1,
                question: q.question,
                options: q.options,
                userAnswer: selectedOption,
                correctAnswer: q.correctAnswer,
                isCorrect: selectedOption === q.correctAnswer,
                explanation: q.explanation,
            };
        });

        return res.json({
            success: true,
            hasSession: true,
            assignment,
            session: {
                _id: session._id,
                jobTitle: session.jobTitle,
                companyName: session.companyName,
                jobDescription: session.jobDescription,
                interviewType: session.interviewType || assignment?.interviewType || 'Technical',
                difficulty: session.difficulty || assignment?.difficulty || 'Medium',
                skills: session.skills || assignment?.skills || [],
                mode: session.mode || 'classic',
                hasResumeContext: Boolean(session.resumeContext?.hasResume),
                coveredTopics: session.coveredTopics || [],
                turns: session.turns || [],
                finalReport: session.finalReport || null,
                status: session.status,
                overallScore: session.overallScore,
                mcqScore: session.mcqScore,
                mcqTotal: session.mcqTotal,
                mcqPercentage: session.mcqTotal ? Math.round((session.mcqScore / session.mcqTotal) * 100) : 0,
                mcqBreakdown,
                subjectiveQuestions: session.subjectiveQuestions,
                subjectiveUserAnswers: session.subjectiveUserAnswers,
                subjectiveEvaluation: session.subjectiveEvaluation,
                candidate: session.userId,
                createdAt: session.createdAt,
            },
        });
    } catch (error) {
        console.error('Error fetching recruiter interview report:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Toggle whether a candidate can view their own interview score/report
 */
export const toggleCandidateReportVisibility = async (req, res) => {
    try {
        const companyId = req.company._id;
        const { assignmentId } = req.body;

        const assignment = await InterviewAssignment.findOne({ _id: assignmentId, companyId });
        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Assignment not found or belongs to another recruiter.',
            });
        }

        assignment.candidateReportVisible = !(assignment.candidateReportVisible !== false);
        await assignment.save();

        return res.json({
            success: true,
            candidateReportVisible: assignment.candidateReportVisible,
            message: `Candidate report visibility set to ${assignment.candidateReportVisible ? 'Visible' : 'Private (Recruiter Only)'}.`,
        });
    } catch (error) {
        console.error('Error toggling report visibility:', error);
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Compare all candidates who were assigned an AI interview for a specific job owned by this recruiter
 */
export const getJobCandidateComparison = async (req, res) => {
    try {
        const companyId = req.company._id;
        const { jobId } = req.params;

        // Strict ownership check: Recruiter must own this job posting
        const job = await Job.findOne({ _id: jobId, companyId });
        if (!job) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only compare candidates for your own job postings.',
            });
        }

        const assignments = await InterviewAssignment.find({ companyId, jobId })
            .populate('candidateId', 'name email image resume skills')
            .populate('sessionId', 'overallScore finalReport turns durationMinutes createdAt status')
            .sort({ score: -1, createdAt: -1 });

        const candidates = assignments
            .filter((a) => a.candidateId)
            .map((a) => {
                const session = a.sessionId;
                const fr = session?.finalReport || {};
                const ds = fr.dimensionScores || {};
                return {
                    assignmentId: a._id,
                    sessionId: session?._id || null,
                    candidate: a.candidateId,
                    status: a.getEffectiveStatus ? a.getEffectiveStatus() : a.status,
                    interviewType: a.interviewType,
                    difficulty: a.difficulty,
                    completedAt: a.completedAt,
                    overallScore: a.score ?? session?.overallScore ?? null,
                    recommendation: a.recommendation || fr.hiringRecommendation || '',
                    dimensionScores: {
                        technicalKnowledge: ds.technicalKnowledge ?? null,
                        problemSolving: ds.problemSolving ?? null,
                        answerRelevance: ds.answerRelevance ?? null,
                        communicationClarity: ds.communicationClarity ?? null,
                        practicalUnderstanding: ds.practicalUnderstanding ?? null,
                        resumeProjectKnowledge: ds.resumeProjectKnowledge ?? null,
                        jobRoleSuitability: ds.jobRoleSuitability ?? null,
                    },
                    strengths: fr.performanceSummary?.strengths || fr.strongTopics || [],
                    weaknesses: fr.performanceSummary?.weaknesses || fr.improvementTopics || [],
                    skillsDemonstrated: fr.resumeAssessment?.skillsDemonstrated || fr.resumeGrounding?.demonstratedSkills || [],
                    unverifiedResumeSkills: fr.resumeAssessment?.unverifiedResumeSkills || fr.resumeGrounding?.unverifiedClaims || [],
                };
            });

        return res.json({
            success: true,
            job: {
                _id: job._id,
                title: job.title,
                location: job.location,
                level: job.level,
                skills: job.skills || [],
            },
            candidates,
        });
    } catch (error) {
        console.error('Error comparing candidates:', error);
        return res.json({ success: false, message: error.message });
    }
};
