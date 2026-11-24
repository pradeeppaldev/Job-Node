import React, { useContext, useEffect, useState } from 'react'
import { assets, viewApplicationsPageData } from '../assets/assets'
import AppContext from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { useNavigate } from 'react-router-dom'

const ViewApplications = () => {

  const {backendUrl, companyToken} = useContext(AppContext)
  const navigate = useNavigate()

  const [applicants, setApplicants] = useState(false)

  // Function to fetch company Job Applications data
  const fetchCompanyJobApplications = async () => {
    try {
      
      const {data} = await axios.get(backendUrl + '/api/company/applicants',
        {headers:{token:companyToken}}
      )
      if(data.success){
        setApplicants(data.applications.reverse())
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  // Function to update Job Application Status
  const changeJobApplicationStatus = async (id, status) => {
    try {
      
      const {data} = await axios.post(backendUrl + '/api/company/change-status',
        {id, status},
        {headers:{token:companyToken}}
      )

      if(data.success){
        fetchCompanyJobApplications()
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if(companyToken){
      fetchCompanyJobApplications()
    }
  },[companyToken])
  
  return applicants ? applicants.length === 0 ? (
    <div className='flex items-center justify-center h-[70vh]'>
    <p className='text-xl sm:text-2xl'>No Applications Available</p>
  </div>
  ) : (
    <div className='container mx-auto p-4'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-bold text-gray-800'>Applicant Management</h2>
        <button
          onClick={() => navigate('/dashboard/ai-interviews')}
          className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5'
        >
          <span>🎤</span> AI Interview Hub
        </button>
      </div>

      <div className='bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm'>
        <table className='w-full text-left max-sm:text-sm'>
          <thead className='bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase'>
            <tr>
              <th className='py-3 px-4 text-center'>#</th>
              <th className='py-3 px-4'>User Name</th>
              <th className='py-3 px-4 max-sm:hidden'>Job Title</th>
              <th className='py-3 px-4 max-sm:hidden'>Location</th>
              <th className='py-3 px-4'>Resume</th>
              <th className='py-3 px-4 text-center'>AI Interview</th>
              <th className='py-3 px-4 text-center'>Status</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {applicants.filter(item => item.jobId && item.userId).map((applicant, index) => (
              <tr key={index} className='text-gray-700 align-middle hover:bg-gray-50/70'>
                <td className='py-3 px-4 text-center text-xs text-gray-400'>{index + 1}</td>

                <td className='py-3 px-4'>
                  <div className='flex items-center gap-3'>
                    <img className='w-9 h-9 rounded-full object-cover max-sm:hidden border border-gray-200' src={applicant.userId.image} alt="" />
                    <div>
                      <p className='font-semibold text-gray-900'>{applicant.userId.name}</p>
                      <p className='text-xs text-gray-500'>{applicant.userId.email}</p>
                    </div>
                  </div>
                </td>

                <td className='py-3 px-4 max-sm:hidden font-medium text-gray-800'>{applicant.jobId.title}</td>

                <td className='py-3 px-4 max-sm:hidden text-gray-500'>{applicant.jobId.location}</td>

                <td className='py-3 px-4'>
                  {applicant.userId.resume ? (
                    <a className='bg-blue-50 text-blue-600 px-3 py-1 rounded inline-flex gap-1.5 items-center text-xs font-medium hover:bg-blue-100' href={applicant.userId.resume} target='_blank' rel="noreferrer">
                      Resume <img src={assets.resume_download_icon} alt="" className='w-3 h-3' />
                    </a>
                  ) : (
                    <span className='text-xs text-gray-400 italic'>No resume</span>
                  )}
                </td>

                <td className='py-3 px-4 text-center'>
                  <button
                    onClick={() => navigate('/dashboard/ai-interviews')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      applicant.interviewStatus === 'Completed'
                        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                        : applicant.interviewStatus === 'Assigned'
                        ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    {applicant.interviewStatus === 'Completed'
                      ? '✓ Interview Done'
                      : applicant.interviewStatus === 'Assigned'
                      ? '⏱ Interview Assigned'
                      : '+ Assign Interview'}
                  </button>
                </td>

                <td className='py-3 px-4 text-center relative'>
                  {
                  applicant.status === 'Pending'
                  ? <div className='relative inline-block text-left group'>
                    <button className='px-3 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-100'>
                      Pending ▾
                    </button>
                    <div className='z-10 hidden absolute right-0 md:left-0 top-0 mt-7 w-32 bg-white border border-gray-200 rounded-lg shadow-lg group-hover:block py-1'>
                      <button onClick={() => changeJobApplicationStatus(applicant._id, 'Accepted')} className='block w-full text-left px-4 py-1.5 text-xs text-green-600 hover:bg-gray-50 font-semibold'>Accept</button>
                      <button onClick={() => changeJobApplicationStatus(applicant._id, 'Rejected')} className='block w-full text-left px-4 py-1.5 text-xs text-red-600 hover:bg-gray-50 font-semibold'>Reject</button>
                    </div>
                  </div>
                  : <span className={`px-2.5 py-1 rounded text-xs font-bold ${applicant.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{applicant.status}</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  ) : <Loading/>
}

export default ViewApplications
