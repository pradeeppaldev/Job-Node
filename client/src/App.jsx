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
