import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
    const [fadingOut, setFadingOut] = useState(false);

    useEffect(() => {
        // Start fade out after 2 seconds
        const timer = setTimeout(() => {
            setFadingOut(true);
            // Remove component after animation finishes (0.5s fade out)
            setTimeout(onFinish, 500);
        }, 2000);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`splash-screen ${fadingOut ? 'fade-out' : ''}`}>
            <div className="splash-content">
                <div className="logo-text">
                    Developed with <span className="heart-pulse">❤️</span> by <span className="highlight">Jugal</span> for <span className="highlight">Ingenium</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
