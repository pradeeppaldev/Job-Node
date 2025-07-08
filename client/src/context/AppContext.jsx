import { createContext, useEffect, useState } from "react";
import { jobsData } from "../assets/assets";

const AppContext = createContext();

export const AppContextProvider =(props) => {

    const [searchFilter, setSearchFilter] = useState({
        title:'',
        location:''
    });

    const [isSearched, setIsSearched] = useState(false)

    const [jobs, setJobs] = useState([]);

    const value = {
        searchFilter, setSearchFilter,
        isSearched, setIsSearched,
        jobs, setJobs
    }

    // Function to fetch jobs
    const fetchJobs = async () => {
        setJobs(jobsData)
    }

    useEffect(() => {
        fetchJobs()
    },[])

    return(
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}

export default AppContext