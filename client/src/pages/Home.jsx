import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import JobListing from '../components/JobListing'
import AppDownload from '../components/AppDownload'
import Footer from '../components/Footer'
import Testimonials from '../components/Testimonials'
import OpportunityGrid from '../components/OpportunityGrids'
import StepsFlow from '../components/Stepflow'

const Home = () => {
  return (
    <div>
      <Navbar/>
      <Hero/>
      <StepsFlow/>
      <JobListing/>
      <Testimonials/>
      <OpportunityGrid/>
      <AppDownload/>
      <Footer/>
    </div>
  )
}

export default Home
