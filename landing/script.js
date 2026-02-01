// =============================================
// SIN ADICCIONES - Landing Page JavaScript
// El primer paso a tu recuperación
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile Navigation Toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const icon = navToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const icon = navToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });
    }
    
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    
    function handleScroll() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animated counter for statistics
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        }
        
        updateCounter();
    }
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Animate counters when stats section is visible
                if (entry.target.classList.contains('hero-stats')) {
                    const counters = entry.target.querySelectorAll('.stat-number');
                    counters.forEach(counter => {
                        const target = parseInt(counter.dataset.count);
                        animateCounter(counter, target);
                    });
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.feature-card, .step, .testimonial-card, .hero-stats').forEach(el => {
        observer.observe(el);
    });
    
    // Add fade-in animation styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .feature-card, .step, .testimonial-card {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .feature-card.animate-in, .step.animate-in, .testimonial-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .feature-card:nth-child(2), .testimonial-card:nth-child(2) {
            transition-delay: 0.1s;
        }
        
        .feature-card:nth-child(3), .testimonial-card:nth-child(3) {
            transition-delay: 0.2s;
        }
        
        .feature-card:nth-child(4) {
            transition-delay: 0.3s;
        }
        
        .feature-card:nth-child(5) {
            transition-delay: 0.4s;
        }
        
        .feature-card:nth-child(6) {
            transition-delay: 0.5s;
        }
        
        .step:nth-child(2) {
            transition-delay: 0.15s;
        }
        
        .step:nth-child(3) {
            transition-delay: 0.3s;
        }
    `;
    document.head.appendChild(style);
    
    // Parallax effect for hero background
    const heroBg = document.querySelector('.hero-bg img');
    
    if (heroBg && window.innerWidth > 768) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
        });
    }
    
    // Phone mockup counter animation
    const phoneCounter = document.querySelector('.counter-days');
    if (phoneCounter) {
        let days = 0;
        const targetDays = 127;
        const counterInterval = setInterval(() => {
            days += 3;
            if (days >= targetDays) {
                days = targetDays;
                clearInterval(counterInterval);
            }
            phoneCounter.textContent = days;
        }, 30);
    }
    
    // Form validation (if forms are added later)
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Add loading state to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Only for external links
            if (this.getAttribute('target') === '_blank') {
                this.classList.add('loading');
                setTimeout(() => {
                    this.classList.remove('loading');
                }, 1000);
            }
        });
    });
    
    // Testimonials auto-scroll on mobile (optional enhancement)
    let testimonialIndex = 0;
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    
    if (window.innerWidth <= 768 && testimonialCards.length > 1) {
        setInterval(() => {
            testimonialCards.forEach(card => card.style.display = 'none');
            testimonialIndex = (testimonialIndex + 1) % testimonialCards.length;
            testimonialCards[testimonialIndex].style.display = 'block';
        }, 5000);
    }
    
    // Console message for developers
    console.log('%c🌟 Sin Adicciones - El primer paso a tu recuperación', 
        'color: #6c1cff; font-size: 16px; font-weight: bold;');
    console.log('%cSi necesitas ayuda, llama al 1412', 
        'color: #ff3b30; font-size: 14px;');
    
});

// PWA Install prompt (for future enhancement)
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or banner if needed
    console.log('PWA install prompt available');
});

// Service Worker registration (optional - for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to register service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('SW registered'))
        //     .catch(err => console.log('SW registration failed'));
    });
}