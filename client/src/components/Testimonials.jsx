import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const testimonials = [
  {
    name: "Kim Seo-hyun",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Got hired at Accenture in just 2 weeks through Job Node!",
    role: "Frontend Developer",
  },
  {
    name: "Ravi Kumar",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "Thanks to this platform, I landed my dream role at Microsoft!",
    role: "Software Engineer",
  },
  {
    name: "Isabella Crater",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    text: "Easy to use, fast results. Highly recommend for freshers!",
    role: "UI/UX Designer",
  },
  {
    name: "Kunal Mehta",
    image: "https://randomuser.me/api/portraits/men/48.jpg",
    text: "I applied to 5 jobs and got 3 interviews in 10 days.",
    role: "Backend Developer",
  },
];

const Testimonials = () => {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    speed: 500,
    slidesToShow: 2,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 768, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Success Stories</h2>
      <Slider {...settings}>
        {testimonials.map((item, index) => (
          <div key={index} className="px-4">
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-500 shadow">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{item.role}</p>
              <p className="text-gray-700 text-sm italic">“{item.text}”</p>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Testimonials;
