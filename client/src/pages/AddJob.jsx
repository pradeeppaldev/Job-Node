import React, { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Quill from 'quill'

const AddJob = () => {

    const [title, setTitle] = useState('')
    const [location, setLocation] = useState('Bangalore')
    const [category, setCategory] = useState('Programming')
    const [level, setLevel] = useState('Beginner Level')
    const [salary, setSalary] = useState('0')

    const editorRef = useRef(null)
    const quillRef = useRef(null)

    useEffect(() => {
        // Initiate quill only once
        if(!quillRef.current & editorRef.current){
            quillRef.current = new Quill(editorRef.current)
        }
    },[])

  return (
    <div>
      <form action="">
        <div>
            <p>Job Title</p>
            <input type="text" placeholder='Type here' onChange={e => setTitle(e.target.value)} value={title} required />
        </div>
        <div>
            <p>Job Description</p>
            <div ref={editorRef}>

            </div>
        </div>
      </form>
    </div>
  )
}

export default AddJob
