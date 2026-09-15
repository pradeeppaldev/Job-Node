import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import InterviewReport from '../../components/mock-interview/InterviewReport';
import AppContext from '../../context/AppContext';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MockInterviewReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { backendUrl } = useContext(AppContext);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const { data } = await axios.get(`${backendUrl}/api/interview/session/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) {
          setSession(data.session);
        } else {
          toast.error(data.message || 'Report not found.');
          navigate('/mock-interview');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load report.');
        navigate('/mock-interview');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, backendUrl, getToken, navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-50/30 to-white">
      <Navbar />

      <main className="flex-grow container px-4 mx-auto py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
            <svg className="animate-spin h-8 w-8 text-purple-600 mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="font-medium">Loading Interview Report...</p>
          </div>
        ) : (
          session && <InterviewReport sessionData={session} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MockInterviewReport;
