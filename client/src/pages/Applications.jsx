import React, { useContext, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { assets, jobsApplied } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import AppContext from '../context/AppContext'
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const Applications = () => {

  const {user} = useUser()
  const {getToken} = useAuth()
  const navigate = useNavigate()

  const [isEdit, setIsEdit] = useState(false)
  const [resume, setResume] = useState(null)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [skills, setSkills] = useState('')
  const [preferredLocations, setPreferredLocations] = useState('')
  const [preferredCategories, setPreferredCategories] = useState('')
  const [preferredLevels, setPreferredLevels] = useState('')
  const [isSavingPref, setIsSavingPref] = useState(false)

  // Assigned Interviews state
  const [assignedInterviews, setAssignedInterviews] = useState([])
  const [loadingInterviews, setLoadingInterviews] = useState(true)
  const [startingInterviewId, setStartingInterviewId] = useState(null)

  const {backendUrl, userData, userApplications, fetchUserData, fetchUserApplications} = useContext(AppContext)

  useEffect(() => {
    if (userData) {
      setPhoneNumber(userData.phoneNumber || '')
      setWhatsappOptIn(userData.whatsappOptIn || false)
      setSkills(Array.isArray(userData.skills) ? userData.skills.join(', ') : '')
      setPreferredLocations(Array.isArray(userData.preferredLocations) ? userData.preferredLocations.join(', ') : '')
      setPreferredCategories(Array.isArray(userData.preferredCategories) ? userData.preferredCategories.join(', ') : '')
      setPreferredLevels(Array.isArray(userData.preferredLevels) ? userData.preferredLevels.join(', ') : '')
    }
  }, [userData])

  // Fetch candidate's assigned interviews
  const fetchAssignedInterviews = async () => {
    if (!user) return
    setLoadingInterviews(true)
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/interview/my-assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setAssignedInterviews(data.assignments || [])
      }
    } catch (err) {
      console.error('Failed to fetch assigned interviews:', err)
    } finally {
      setLoadingInterviews(false)
    }
  }

  // Candidate action to start / continue assigned interview
  const handleStartInterview = async (assignment) => {
    setStartingInterviewId(assignment._id)
    try {
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/interview/start-assigned`,
        { assignmentId: assignment._id },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.isResumed ? 'Resuming your active interview session...' : 'Interview session started!')
        navigate(`/mock-interview/session/${data.sessionId}`, {
          state: { session: data.session, assignmentId: assignment._id }
        })
      } else {
        toast.error(data.message || 'Failed to start interview.')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Error starting interview: ' + err.message)
    } finally {
      setStartingInterviewId(null)
    }
  }

  const updatePreferences = async (e) => {
    e.preventDefault()
    setIsSavingPref(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(
        backendUrl + '/api/users/update-profile',
        {
          phoneNumber,
          whatsappOptIn,
          skills,
          preferredLocations,
          preferredCategories,
          preferredLevels,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        await fetchUserData()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSavingPref(false)
    }
  }

  const updateResume = async () => {
    try {

      const formData = new FormData()
      formData.append('resume', resume)

      const token = await getToken()

      const {data} = await axios.post(backendUrl + '/api/users/update-resume', 
        formData,
        {headers:{Authorization:`Bearer ${token}`}}
      )

      if(data.success){
        toast.success(data.message)
        await fetchUserData()
      } else {
        toast.error(data.message)
      }
      
    } catch (error) {
      toast.error(error.message)
    }

    setIsEdit(false)
    setResume(null)

  }

  useEffect(() => {
    if(user){
      fetchUserApplications()
      fetchAssignedInterviews()
    }
  },[user])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
      case 'ASSIGNED':
      case 'NOT_STARTED':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'EXPIRED':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <>
      <Navbar/>
      <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10 space-y-10'>
        <div>
          <h2 className='text-xl font-semibold'>Your Resume</h2>
          <div className='flex gap-2 mb-6 mt-3'>
            {
              isEdit || userData && userData?.resume === ''
              ? <>
              <label className='flex items-center' htmlFor="resumeUpload">
                <p className='bg-blue-100 text-blue-600 px-4 py-2 rounded-lg mr-2'>{resume ? resume.name : 'Select Resume'}</p>
                <input id='resumeUpload' onChange={e => setResume(e.target.files[0])} accept='application/pdf' type="file" />
                <img src={assets.profile_upload_icon} alt="" />
              </label>
              <button onClick={updateResume} className='bg-green-100 border border-green-400 rounded-lg px-4 py-2'>Save</button>
              </>
              : <div className='flex gap-2'>
                <a target='_blank' href={userData?.resume} className='bg-blue-100 text-blue-600 px-4 py-2 rounded-lg'>
                  Resume
                </a>
                <button onClick={() => setIsEdit(true)} className='text-gray-500 border border-gray-300 rounded-lg px-4 py-2'>Edit</button>
              </div>
            }
          </div>
        </div>

        {/* WhatsApp & Matching Preferences Card */}
        <div className='bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-200 rounded-2xl p-6 shadow-sm'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold'>
              💬
            </div>
            <div>
              <h2 className='text-lg font-bold text-gray-900'>WhatsApp Job Alerts & Profile Preferences</h2>
              <p className='text-xs text-gray-600'>
                Set your phone number and skills to receive instant WhatsApp notifications when new matching jobs are posted.
              </p>
            </div>
          </div>

          <form onSubmit={updatePreferences} className='space-y-4'>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id='whatsappOptIn'
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className='w-5 h-5 text-blue-600 rounded cursor-pointer'
              />
              <label htmlFor='whatsappOptIn' className='text-sm font-semibold text-blue-900 cursor-pointer'>
                Receive WhatsApp notifications when new jobs matching your preferences are posted
              </label>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  WhatsApp Phone Number (with Country Code)
                </label>
                <input
                  type='text'
                  placeholder='e.g. +919876543210'
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Your Skills (Comma Separated)
                </label>
                <input
                  type='text'
                  placeholder='e.g. Java, React, SQL, Spring Boot'
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Preferred Locations
                </label>
                <input
                  type='text'
                  placeholder='e.g. Bangalore, Remote'
                  value={preferredLocations}
                  onChange={(e) => setPreferredLocations(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Preferred Categories
                </label>
                <input
                  type='text'
                  placeholder='e.g. Programming, Data Science'
                  value={preferredCategories}
                  onChange={(e) => setPreferredCategories(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Preferred Levels
                </label>
                <input
                  type='text'
                  placeholder='e.g. Beginner Level, Senior Level'
                  value={preferredLevels}
                  onChange={(e) => setPreferredLevels(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={isSavingPref}
              className='bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer text-sm shadow-sm'
            >
              {isSavingPref ? 'Saving Preferences...' : 'Save WhatsApp Preferences'}
            </button>
          </form>
        </div>

        {/* ================= RECRUITER ASSIGNED AI INTERVIEWS SECTION ================= */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-bold text-gray-900 flex items-center gap-2'>
                <span>🎯</span> Recruiter-Assigned AI Interviews
              </h2>
              <p className='text-xs text-gray-500 mt-0.5'>
                Formal AI interviews assigned directly by recruiters for your applied roles.
              </p>
            </div>
            {assignedInterviews.length > 0 && (
              <span className='px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full'>
                {assignedInterviews.length} Assigned
              </span>
            )}
          </div>

          {loadingInterviews ? (
            <div className='py-8 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200'>
              Loading your interview assignments...
            </div>
          ) : assignedInterviews.length === 0 ? (
            <div className='bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center'>
              <span className='text-3xl block mb-2'>🎙️</span>
              <h3 className='font-bold text-gray-800 text-base'>No Assigned AI Interviews</h3>
              <p className='text-xs text-gray-500 max-w-md mx-auto mt-1'>
                When recruiters review your job applications and invite you for an AI interview, it will appear here with instructions, deadline, and a direct access link.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {assignedInterviews.map((item) => {
                const isExpired = item.status === 'EXPIRED' || (item.deadline && new Date() > new Date(item.deadline) && item.status !== 'COMPLETED')
                const isCompleted = item.status === 'COMPLETED'
                const isCancelled = item.status === 'CANCELLED'
                const isInProgress = item.status === 'IN_PROGRESS'
                const isStarting = startingInterviewId === item._id

                return (
                  <div
                    key={item._id}
                    className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4'
                  >
                    <div>
                      {/* Top Bar: Company & Status */}
                      <div className='flex items-start justify-between gap-3 mb-3'>
                        <div className='flex items-center gap-3'>
                          <img
                            src={item.company?.image || assets.company_icon}
                            alt=""
                            className='w-10 h-10 rounded-xl border border-gray-100 object-cover'
                          />
                          <div>
                            <h3 className='font-bold text-gray-900 text-base leading-tight'>
                              {item.job?.title || 'Job Opportunity'}
                            </h3>
                            <p className='text-xs text-gray-500'>{item.company?.name || 'Recruiter'}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Specs badges */}
                      <div className='flex flex-wrap gap-1.5 mb-3 text-xs'>
                        <span className='px-2.5 py-1 rounded-lg font-medium bg-purple-50 text-purple-700 border border-purple-100'>
                          {item.interviewType} Round
                        </span>
                        <span className='px-2.5 py-1 rounded-lg font-medium bg-gray-100 text-gray-700'>
                          {item.difficulty} Level
                        </span>
                        <span className='px-2.5 py-1 rounded-lg font-medium bg-blue-50 text-blue-700'>
                          ⏱ {item.durationMinutes} min ({item.questionCount} Questions)
                        </span>
                      </div>

                      {/* Skills Tags */}
                      {item.skills && item.skills.length > 0 && (
                        <div className='text-xs text-gray-600 mb-2'>
                          <span className='font-semibold text-gray-700'>Skills Assessed: </span>
                          <span className='text-gray-500'>{item.skills.join(', ')}</span>
                        </div>
                      )}

                      {/* Custom instructions */}
                      {item.customInstructions && (
                        <p className='text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3'>
                          " {item.customInstructions} "
                        </p>
                      )}

                      {/* Deadline & Dates */}
                      <div className='flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100'>
                        <span>Assigned: {moment(item.createdAt).format('MMM D, YYYY')}</span>
                        <span className={`font-semibold ${isExpired ? 'text-red-500' : 'text-gray-700'}`}>
                          Deadline: {moment(item.deadline).format('MMM D, h:mm A')}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className='pt-2'>
                      {isCompleted ? (
                        item.candidateReportVisible === false ? (
                          <div className='p-3 rounded-xl bg-blue-50 border border-blue-200 text-center text-xs font-semibold text-blue-800'>
                            ✓ Interview Submitted • Under Recruiter Review 🔒
                          </div>
                        ) : (
                          <div className='flex items-center justify-between bg-green-50/70 p-3 rounded-xl border border-green-200'>
                            <div>
                              <span className='text-xs font-semibold text-green-700'>Score Achieved:</span>
                              <span className='text-lg font-extrabold text-green-900 ml-2'>{item.score}%</span>
                            </div>
                            <button
                              onClick={() => navigate(`/mock-interview/session/${item.sessionId}`)}
                              className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors'
                            >
                              View Report 📊
                            </button>
                          </div>
                        )
                      ) : isCancelled ? (
                        <div className='p-2.5 rounded-xl bg-gray-100 text-center text-xs font-semibold text-gray-500'>
                          This interview assignment was cancelled by the recruiter.
                        </div>
                      ) : isExpired ? (
                        <div className='p-2.5 rounded-xl bg-red-50 border border-red-200 text-center text-xs font-semibold text-red-600'>
                          Deadline has passed. Contact the recruiter to request a retake.
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartInterview(item)}
                          disabled={isStarting}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow transition-all flex items-center justify-center gap-2 ${
                            isInProgress ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isStarting ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              <span>Initializing Interview...</span>
                            </>
                          ) : isInProgress ? (
                            <span>▶ Continue Interview Session</span>
                          ) : (
                            <span>🚀 Start Assigned AI Interview</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Existing Jobs Applied Table */}
        <h2 className='text-xl font-semibold mb-4'>Job Applied</h2>
        <table className='min-w-full bg-white border rounded-lg'>
          <thead>
            <tr>
              <th className='py-3 px-4 border-b text-left'>Company</th>
              <th className='py-3 px-4 border-b text-left'>Job Title</th>
              <th className='py-3 px-4 border-b text-left max-sm:hidden'>Location</th>
              <th className='py-3 px-4 border-b text-left max-sm:hidden'>Date</th>
              <th className='py-3 px-4 border-b text-left'>Status</th>
            </tr>
          </thead>
          <tbody>
            {
              userApplications.map((job,index) => true ? (
                <tr key={index}>
                  <td className='py-3 px-4 flex items-center gap-2 border-b'>
                    <img className='w-8 h-8' src={job.companyId.image} alt="" />
                    {job.companyId.name}
                  </td>
                  <td className='py-2 px-4 border-b'>{job.jobId.title}</td>
                  <td className='py-2 px-4 border-b max-sm:hidden'>{job.jobId.location}</td>
                  <td className='py-2 px-4 border-b max-sm:hidden'>{moment(job.date).format('ll')}</td>
                  <td className='py-2 px-4 border-b'>
                    <span className={`${job.status === 'Accepted' ? 'bg-green-100' : job.status === 'Rejected' ? 'bg-red-100' : 'bg-blue-100'} px-4 py-1.5 rounded`}>
                      {job.status}
                    </span>
                  </td>
                </tr>
              ) : (null))
            }
          </tbody>
        </table>
      </div>
      <Footer/>
    </>
  )
}

export default Applications
