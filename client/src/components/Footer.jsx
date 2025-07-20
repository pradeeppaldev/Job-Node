import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className="bg-[#3e2d75] text-white py-10 mt-20 shadow-footer-up relative z-10" >
      <div className="container mx-auto px-4 2xl:px-20 grid md:grid-cols-3 gap-8">

        <div>
          <img className='mb-4' src={assets.logo_removebg} width={160} alt="" />
          <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
          <div className="flex items-start mb-2">
            <span className="mr-3 text-xl">📍</span>
            <p>Job Node Pvt. Ltd<br />Mumbai, India</p>
          </div>
          <div className="flex items-center mb-2">
            <span className="mr-3 text-xl">📞</span>
            <p>+91-22-1234-5678</p>
          </div>
          <div className="flex items-center">
            <span className="mr-3 text-xl">✉️</span>
            <p>support@jobnode.com</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">About Job Node</h3>
          <p className="text-sm text-gray-300">
            Job Node is your gateway to opportunities. We connect talent with the right employers. Join us to discover your next career move today.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
          <div className="flex gap-4 mt-2">
            <img className="cursor-pointer hover:border-zinc-600 hover:border-2 rounded-full" width={40} src={assets.linkedin_icon} alt="Facebook" />
            <img className="cursor-pointer hover:border-zinc-600 hover:border-2 rounded-full" width={40} src={assets.youtube_icon} alt="Facebook" />
            <img className="cursor-pointer hover:border-zinc-600 hover:border-2 rounded-full" width={40} src={assets.twitter_icon} alt="Twitter" />
            <img className="cursor-pointer hover:border-zinc-600 hover:border-2 rounded-full" width={40} src={assets.facebook_icon} alt="Facebook" />
            <img className="cursor-pointer hover:border-zinc-600 hover:border-2 rounded-full" width={40} src={assets.instagram_icon} alt="Instagram" />
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="text-center text-sm text-gray-400 mt-8">
        © {new Date().getFullYear()} Job Node | All rights reserved.
      </div>
    </div>
  )
}

export default Footer
