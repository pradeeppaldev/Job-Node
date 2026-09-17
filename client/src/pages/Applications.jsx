import React, { useContext, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { assets, jobsApplied } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import AppContext from '../context/AppContext'
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify'

const Applications = () => {

  const {user} = useUser()
  const {getToken} = useAuth()

  const [isEdit, setIsEdit] = useState(false)
  const [resume, setResume] = useState(null)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [skills, setSkills] = useState('')
  const [preferredLocations, setPreferredLocations] = useState('')
  const [preferredCategories, setPreferredCategories] = useState('')
  const [preferredLevels, setPreferredLevels] = useState('')
  const [isSavingPref, setIsSavingPref] = useState(false)

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
    }
  },[user])

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
                <button onClick={() => setIsEdit(true)} className='text-gray-500 border border-e-gray-300 rounded-lg px-4 py-2'>
                  Edit
                </button>
              </div>
            }
          </div>
        </div>

        {/* WhatsApp Job Alerts & Profile Preferences */}
        <div className='bg-white p-6 rounded-2xl border border-gray-200 shadow-sm'>
          <h2 className='text-xl font-bold text-gray-900 mb-2 flex items-center gap-2'>
            <span>💬 WhatsApp Job Alerts & Preferences</span>
          </h2>
          <p className='text-sm text-gray-500 mb-6'>
            Receive WhatsApp notifications when new jobs matching your preferences are posted.
          </p>

          <form onSubmit={updatePreferences} className='space-y-4 max-w-2xl'>
            <div className='flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 mb-4'>
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
