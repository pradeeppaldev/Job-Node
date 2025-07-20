import React from 'react';
import { Briefcase, GraduationCap, Laptop, Users, Trophy, MoreHorizontal } from 'lucide-react';
import { assets } from '../assets/assets';

const cards = [
  {
    title: 'Internships',
    desc: 'Gain Practical Experience',
    bg: 'bg-teal-200',
    icon: <Briefcase className="w-10 h-10 text-teal-700" />,
  },
  {
    title: 'Mentorships',
    desc: 'Guidance From Top Mentors',
    bg: 'bg-orange-200',
    icon: <Users className="w-10 h-10 text-orange-700" />,
  },
  {
    title: 'Jobs',
    desc: 'Explore Diverse Careers',
    bg: 'bg-blue-200',
    icon: <GraduationCap className="w-10 h-10 text-blue-700" />,
  },
  {
    title: 'Practice',
    desc: 'Refine Skills Daily',
    bg: 'bg-purple-200',
    icon: <Laptop className="w-10 h-10 text-purple-700" />,
  },
  {
    title: 'Competitions',
    desc: 'Battle For Excellence',
    bg: 'bg-yellow-200',
    icon: <Trophy className="w-10 h-10 text-yellow-700" />,
  },
  {
    title: 'More',
    desc: 'Discover More Tools',
    bg: 'bg-pink-200',
    icon: <MoreHorizontal className="w-10 h-10 text-pink-700" />,
  },
];

const OpportunityGrid = () => {
  return (
    <section className="py-10 px-4 md:px-10">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 flex justify-center items-center gap-2">
                <img width={45} src={assets.fire} alt="fire" className="inline align-middle" />
                It's Time to <span className="text-blue-600">#NodeUp</span>
            </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`rounded-xl p-6 ${card.bg} shadow-md hover:scale-105 transform transition duration-300 ease-in-out cursor-pointer`}
          >
            <div className="mb-4">{card.icon}</div>
            <h3 className="text-xl font-semibold mb-1">{card.title}</h3>
            <p className="text-gray-700">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OpportunityGrid;
