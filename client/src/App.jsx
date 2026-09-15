import './App.css'
import React, { useContext } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import ApplyJob from './pages/ApplyJob'
import Applications from './pages/Applications'
import RecruiterLogin from './components/RecruiterLogin'
import AppContext from './context/AppContext'
import Dashboard from './pages/Dashboard'
import AddJob from './pages/AddJob'
import ManageJob from './pages/ManageJob'
import ViewApplications from './pages/ViewApplications'
import AiResumeHome from './pages/ai-resume/AiResumeHome'
import AiResumeUpload from './pages/ai-resume/AiResumeUpload'
import AiResumeDetails from './pages/ai-resume/AiResumeDetails'
import MockInterviewHome from './pages/mock-interview/MockInterviewHome'
import MockInterviewSession from './pages/mock-interview/MockInterviewSession'
import MockInterviewReport from './pages/mock-interview/MockInterviewReport'
import 'quill/dist/quill.snow.css'
import { ToastContainer } from 'react-toastify';

const App = () => {

  const {showRecruiterLogin, companyToken, setShowRecruiterLogin} = useContext(AppContext)

  return (
    <div>
      {showRecruiterLogin && <RecruiterLogin/>}
      <ToastContainer/>
      <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/apply-job/:id' element={<ApplyJob/>}/>
          <Route path='/applications' element={<Applications/>}/>
          <Route path='/analyze-resume' element={<AiResumeHome/>}/>
          <Route path='/analyze-resume/upload' element={<AiResumeUpload/>}/>
          <Route path='/analyze-resume/:id' element={<AiResumeDetails/>}/>
          <Route path='/mock-interview' element={<MockInterviewHome/>}/>
          <Route path='/mock-interview/session/:id' element={<MockInterviewSession/>}/>
          <Route path='/mock-interview/report/:id' element={<MockInterviewReport/>}/>
          <Route path='/dashboard' element={<Dashboard/>}>
            {
            companyToken? 
            <>
              <Route path='add-job' element={<AddJob/>}></Route>
              <Route path='manage-jobs' element={<ManageJob/>}></Route>
              <Route path='view-applications' element={<ViewApplications/>}></Route>
            </>:null
            }
              
          </Route>
      </Routes>
    </div>
  )
}

export default App
