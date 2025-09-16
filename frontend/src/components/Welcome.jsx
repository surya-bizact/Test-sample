import React, { useState, useEffect } from "react";
import { useGetFeedbackQuery, useSubmitFeedbackMutation } from "../redux/apiSlice";
import "./Welcome.css";
import RoomIcon from '../../public/welcomeimages/home.png';
import EasyEdit from '../../public/welcomeimages/easy-edit.png';
import Folder from '../../public/welcomeimages/folder.png';
import Paint from '../../public/welcomeimages/paint.png';
import Responsive from '../../public/welcomeimages/responsive.png';
import Wall from '../../public/welcomeimages/wall.png';
import HeroRight from '../../public/welcomeimages/hero-right.png';
import AlterSection from '../../public/welcomeimages/alter-section.png';
import Feedback from '../../public/welcomeimages/feedback-image.png';
import Rating5 from '../../public/welcomeimages/rating-5.png';
import Rating4 from '../../public/welcomeimages/rating-4.png';
import Rating3 from '../../public/welcomeimages/rating-3.png';
import Rating2 from '../../public/welcomeimages/rating-2.png';
import Rating1 from '../../public/welcomeimages/rating-1.png';
import Logo from '../../public/welcomeimages/footer-logo.png';

const Welcome = ({ onLogin, onRegister }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentReviewPage, setCurrentReviewPage] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [feedback, setFeedback] = useState({
    name: '',
    email: '',
    rating: 0,
    message: ''
  });
  const [hoverRating, setHoverRating] = useState(0);
  // RTK Query hooks for feedback
  const { data: feedbackResponse = { data: [] }, isLoading: isLoadingFeedback } = useGetFeedbackQuery();
  const [submitFeedback, { isLoading: isSubmitting }] = useSubmitFeedbackMutation();

  // Map the feedback data to match the expected format
  const feedbackList = feedbackResponse.data || [];

  const reviewsPerPage = 3;
  const totalReviewPages = Math.ceil(feedbackList.length / reviewsPerPage);

  const nextReviewPage = () => {
    setCurrentReviewPage(prev => (prev === totalReviewPages - 1 ? 0 : prev + 1));
  };

  const prevReviewPage = () => {
    setCurrentReviewPage(prev => (prev === 0 ? totalReviewPages - 1 : prev - 1));
  };

  const goToReviewPage = (index) => {
    setCurrentReviewPage(index);
  };

  const slides = [
    {
      id: 1,
      image: "/welcomeimages/altar1.png",
      alt: "Traditional Altar Design",
      title: "Traditional Altar Design"
    },
    {
      id: 2,
      image: "/welcomeimages/altar2.png",
      alt: "Modern Altar Design",
      title: "Modern Altar Design"
    },
    {
      id: 3,
      image: "/welcomeimages/altar3.png",
      alt: "Minimalist Altar Design",
      title: "Minimalist Altar Design"
    }
  ];

  const goToSlide = (index) => {
    setCurrentSlide(index);
    // Reset autoplay timer when manually changing slides
    if (isAutoPlay) {
      setIsAutoPlay(false);
      setTimeout(() => setIsAutoPlay(true), 8000);
    }
  };

  const goToPrevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
    if (isAutoPlay) {
      setIsAutoPlay(false);
      setTimeout(() => setIsAutoPlay(true), 8000);
    }
  };

  const goToNextSlide = () => {
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    if (isAutoPlay) {
      setIsAutoPlay(false);
      setTimeout(() => setIsAutoPlay(true), 8000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.name || !feedback.email || !feedback.message || feedback.rating === 0) {
      alert('Please fill in all fields and provide a rating');
      return;
    }

    try {
      await submitFeedback({
        name: feedback.name,
        email: feedback.email,
        rating: feedback.rating,
        message: feedback.message,
        date: new Date().toISOString()
      }).unwrap();
      
      // Reset the form2
      setFeedback({
        name: '',
        email: '',
        rating: 0,
        message: ''
      });
      setHoverRating(0);
      
      // Show success message
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlay) return;
    
    const timer = setTimeout(() => {
      goToNextSlide();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [currentSlide, isAutoPlay]);
  
  // Pause autoplay when hovering over the carousel
  const handleMouseEnter = () => {
    setIsAutoPlay(false);
  };
  
  const handleMouseLeave = () => {
    setIsAutoPlay(true);
  };
  
  // Auto-hide controls state is now managed at the top with other states

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        {/* Header */}
        <header className="welcome-header">
          <div className="header-container">
          <div className="header-left">
            <div className="logo-container">
              <img 
                src="/logo/logo.png" 
                alt="Logo" 
                className="logo-image"
              />
            </div>
            <div className="app-name">
              {/* <span className="app-name-a">A</span>
              <span className="app-name-ltar">ltar</span>
              <span className="app-name-m">M</span>
              <span className="app-name-aker">aker</span> */}
              <span>Alter Maker</span>
            </div>
          </div>
          
          <div className="header-right">
            <a href="">About Us</a>
            <a href="">FAQ</a>
            <button className="get-started-btn" onClick={onLogin}>
              Sign Up
            </button>
          </div>
          </div>
      </header>
        <div className="hero-section">
          <div className="hero-section-left">
            <h1 className="hero-title">
              Celebrate the memory of <br /><strong>loved ones with a<br/> heartfelt </strong>virtual Altar.
            </h1>
            <p className="hero-subtitle">
              Design and customize your sacred spaces with our intuitive 3D altar maker
            </p>
          </div>
          <div className="hero-section-right">
            <img src={HeroRight} alt="Hero" className="hero-image" />
          </div>
        </div>

      {/* Main Content */}
      <main className="welcome-content">
        
        {/* Feature Section */}
        <div className="features-section">
          <h2 className="features-title">What You Can Do</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <img src={RoomIcon} alt="3D Room Design Icon" />
              </div>
              <h3>3D Room Design</h3>
              <p>Create and visualize your altar in realistic 3D space. Choose from different room types and customize dimensions.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src={Wall} alt="Wall Customization Icon" />
              </div>
              <h3>Wall Customization</h3>
              <p>Design each wall individually with beautiful wallpapers, frames, and decorative elements.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src={Paint} alt="Rich Decoration Library Icon" />
              </div>
              <h3>Rich Decoration Library</h3>
              <p>Access hundreds of stickers, frames, and decorative items to personalize your altar design.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src={Folder} alt="Save & Share Icon" />
              </div>
              <h3>Save & Share</h3>
              <p>Save your designs and create multiple sessions. Download your completed altar designs as images.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src={EasyEdit} alt="Easy Editing Icon" />
              </div>
              <h3>Easy Editing</h3>
              <p>Drag, resize, and position elements with ease. Real-time preview of your changes.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src={Responsive} alt="Responsive Design Icon" />
              </div>
              <h3>Responsive Design</h3>
              <p>Works perfectly on desktop, tablet, and mobile devices for design on the go.</p>
            </div>
          </div>
        </div>
        {/*End:: Feature Section */}
        {/* How It Works Section */}
          <h2 className="how-it-works-title">How It Works</h2>
        <div className="how-it-works">
          <div className="steps-container">
            <div className="step">
              
              <div className="step-number">
                <span className="step-number-text">Step</span>
                <span className="step-number-value">01</span>
              </div>
              <h3>Choose Your Space</h3>
              <p>Select room type and set <br />dimensions for your altar space</p>
            </div>
            <div className="step">
              <div className="step-number">
                <span className="step-number-text">Step</span>
                <span className="step-number-value">02</span>
              </div>
              <h3>Design Walls</h3>
              <p>Add wallpapers, frames <br />and decorative elements to each<br /> wall</p>
            </div>
            <div className="step">
              <div className="step-number">
                <span className="step-number-text">Step</span>
                <span className="step-number-value">03</span>
              </div>
              <h3>Preview & Save</h3>
              <p>View your design in 3D and <br />save your completed altar</p>
            </div>
          </div>
        </div>
        {/*End:: How It Works Section */}
        {/* Altar Showcase Section */}
          <h2 className="altar-showcase-title">See AltarMaker in Action</h2>
          <div className="action-section">
            <div className="action-section-container">
              <div className="action-section-left">
                <img src={AlterSection} />
              </div>
            <div className="action-section-right">
              <h2 className="action-section-text">Explore beautiful altar<br /> designs created by our<br /> community</h2>
              <button className="action-section-btn">Click Here</button>
            </div>
            </div>
          </div>
        {/* <div className="altar-showcase">
          <p className="altar-showcase-subtitle">Explore beautiful altar designs created by our community</p>
          
          <div 
            className="showcase-container"
            onMouseEnter={() => {
              handleMouseEnter();
              setShowControls(true);
            }}
            onMouseLeave={() => {
              handleMouseLeave();
              setShowControls(false);
            }}
          >
            <button 
              className={`nav-arrow left-arrow ${showControls ? 'visible' : ''}`} 
              onClick={goToPrevSlide}
              aria-label="Previous slide"
            >
              ❮
            </button>
            
            {slides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`showcase-slide ${index === currentSlide ? 'active' : ''}`}
              >
                <img 
                  src={slide.image} 
                  alt={slide.alt} 
                  loading={index === currentSlide ? 'eager' : 'lazy'}
                />
                <div className="slide-caption">{slide.title}</div>
              </div>
            ))}
            
            <button 
              className={`nav-arrow right-arrow ${showControls ? 'visible' : ''}`} 
              onClick={goToNextSlide}
              aria-label="Next slide"
            >
              ❯
            </button>
          </div>
          
          <div className={`showcase-dots ${showControls ? 'visible' : ''}`}>
            {slides.map((_, index) => (
              <span 
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                onKeyDown={(e) => e.key === 'Enter' && goToSlide(index)}
                role="button"
                tabIndex={0}
                aria-label={`Go to slide ${index + 1}`}
              ></span>
            ))}
          </div>
        </div> */}
        {/*End:: Altar Showcase Section */}

        {/* Reviews Section */}
        <div className="reviews-section">
          <h2 className="section-title">What Our Users Say</h2>
          {feedbackList.length > 0 ? (
            <div className="reviews-carousel">
              <button 
                className="carousel-arrow left"
                onClick={prevReviewPage}
                aria-label="Previous reviews"
              >
                ❮
              </button>
              
              <div className="reviews-slide-container">
                <div 
                  className="reviews-grid"
                  style={{
                    transform: `translateX(-${currentReviewPage * 100}%)`,
                    width: `${totalReviewPages * 100}%`
                  }}
                >
                  {feedbackList.map((item, index) => (
                    <div key={index} className="review-card">
                      <div className="review-top">
                        <div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="25" viewBox="0 0 30 25" fill="none">
                            <path d="M12.4332 0L7.78075 17.9032L6.49733 11.8548C8.36898 11.8548 9.91978 12.4462 11.1497 13.629C12.3797 14.8118 12.9947 16.3979 12.9947 18.3871C12.9947 20.3763 12.3797 21.9892 11.1497 23.2258C9.91978 24.4086 8.39572 25 6.57754 25C4.65241 25 3.07487 24.3817 1.84492 23.1452C0.614973 21.9086 0 20.3226 0 18.3871C0 17.7419 0.026738 17.1505 0.0802138 16.6129C0.187166 16.0215 0.374332 15.3226 0.641711 14.5161C0.909091 13.7097 1.28342 12.6882 1.76471 11.4516L6.01604 0H12.4332ZM29.4385 0L24.7861 17.9032L23.5027 11.8548C25.3743 11.8548 26.9251 12.4462 28.1551 13.629C29.385 14.8118 30 16.3979 30 18.3871C30 20.3763 29.385 21.9892 28.1551 23.2258C26.9251 24.4086 25.4011 25 23.5829 25C21.6578 25 20.0802 24.3817 18.8503 23.1452C17.6203 21.9086 17.0053 20.3226 17.0053 18.3871C17.0053 17.7419 17.0321 17.1505 17.0856 16.6129C17.1925 16.0215 17.3797 15.3226 17.6471 14.5161C17.9144 13.7097 18.2888 12.6882 18.7701 11.4516L23.0214 0H29.4385Z" fill="#BC4034"/>
                          </svg>
                        </div>
                        <div className="review-stars">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < item.rating ? 'active' : ''}>★</span>
                            ))}
                          </div>
                      </div>
                      <div className="review-content">
                        "{item.message}"
                      </div>
                      <div className="review-author">
                        <div className="author-avatar">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="author-info">
                          <h4>{item.name}</h4>
                          
                          <div className="review-date">
                            {item.date ? new Date(item.date).toLocaleDateString() : 'Just now'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                className="carousel-arrow right"
                onClick={nextReviewPage}
                aria-label="Next reviews"
              >
                ❯
              </button>
              
              {totalReviewPages > 1 && (
                <div className="carousel-dots">
                  {[...Array(totalReviewPages)].map((_, index) => (
                    <button
                      key={index}
                      className={`carousel-dot ${index === currentReviewPage ? 'active' : ''}`}
                      onClick={() => goToReviewPage(index)}
                      aria-label={`Go to review page ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-feedback">
              <p>No reviews yet. Be the first to share your experience!</p>
            </div>
          )}
        </div>
        {/* End:: Reviews Section */}
        
        {/* Feedback Form Section */}
        <h2 className="section-title">Share Your Feedback</h2>
        <div className="feedback-section">
          <div className="feedback-container">
            <div className="feedback-left">
              <img src={Feedback} alt="Feedback" className="feedback-image" />
            </div>
            <div className="feedback-right">
            <form onSubmit={handleSubmit} className="feedback-form">
              <h2>Gives us your feedback to improve</h2>
              <div className="form-group">
                <div className="rating-container">
                  <div className="rating-block">
                    {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${star <= feedback.rating ? 'active' : ''}`}
                      onClick={() => setFeedback({...feedback, rating: star})}
                    >
                      {
                        star === 1 ? 
                        <div className="rate-emoji">
                          <img src={Rating1} alt="1 Star" />                           
                        </div>
                          :
                        star === 2 ? 
                        <div className="rate-emoji">
                          <img src={Rating2} alt="2 Stars" /> 
                        </div>:                        
                        star === 3 ? 
                        <div className="rate-emoji">
                          <img src={Rating3} alt="3 Stars" /> 
                        </div>:
                          star === 4 ?
                        <div className="rate-emoji">
                          <img src={Rating4} alt="4 Stars" />
                        </div>:
                        <div className="rate-emoji">
                          <img src={Rating5} alt="5 Stars" />
                        </div>
                      }
                    </span>
                  ))}
                  </div>
                  <div className="rating-info">
                    <span className="rating-text">
                    {feedback.rating > 0 ? `${feedback.rating} Star${feedback.rating > 1 ? 's' : ''}` : 'Rate your experience'}
                  </span>
                  </div>
                  
                  
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half-width">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={feedback.name}
                    onChange={(e) => setFeedback({...feedback, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group half-width">
                  <input
                    type="email"
                    placeholder="Your Email"
                    value={feedback.email}
                    onChange={(e) => setFeedback({...feedback, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <textarea
                  placeholder="Share your Feedback"
                  value={feedback.message}
                  onChange={(e) => setFeedback({...feedback, message: e.target.value})}
                  required
                  rows="4"
                ></textarea>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>

            </div>
          </div>
        </div>

        
        {/* <div className="cta-section">
          <h2>Ready to Create Your Altar?</h2>
          <p>Join thousands of users who have created beautiful sacred spaces</p>
          <button 
            className="get-started-btn" 
            onClick={onLogin}
            style={{
              marginTop: '20px',
              padding: '12px 30px',
              fontSize: '1.2rem'
            }}
          >
            🚀 Get Started
          </button>
        </div> */}

        <div className="footer">
          <div className="footer-container">
            <div className="footer-top">
              <div className="footer-left">
                  <img src={Logo} alt='logo' className="footer-logo" />
              </div>
              <div className="footer-middle">
                <h3>Address</h3>
                <p>AddressHitech Pearl, Vittal Rao Nagar, HITEC City, Hyderabad, Telangana 500081. </p>
                <h3>Contact</h3>
                <p>18004199501</p>
                <p>support@bizacuity.com</p>
              </div>
              <div className="footer-right">
                <a href="">Our App</a>
                <a href="">Blog</a>
                <a href="">Our Team</a>
                <a href="">Annual Filling Report</a>
              </div>
            </div>
            <div className="footer-bottom">
              <small>© 2025 BizAcuity. All Rights Reserved</small>
            </div>
          </div>
        </div>

      </main>
      </div>
    </div>
  );
};

export default Welcome; 