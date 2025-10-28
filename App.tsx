import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { PhoneComparisonTable } from './components/PhoneComparisonTable';
import { RecommendationSection } from './components/RecommendationSection';
import { UserInput } from './components/UserInput';
import { getPhoneRecommendations, getPhoneConstraints, generatePhoneListFromConstraints, getSpecsForPhone, getCountryFromCoords, clearAiLogs, getAiLogs } from './services/geminiService';
import { PHONE_SPECS } from './constants'; // Removed PHONE_DATA
import type { RecommendationResponse, Phone, Review } from './types';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import { ReviewModal } from './components/ReviewModal';
import { useReviews } from './hooks/useReviews';
import { Filters } from './components/Filters';
import { ListGenerator } from './components/ListGenerator';
import { ChatBubble } from './components/ChatBubble';
import { ChatWindow } from './components/ChatWindow';
import { LiveRecommendationModal } from './components/LiveRecommendationModal';

interface CircularProgressBarProps {
  progress: number; // 0-100
  stage: number;
  totalStages: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  progress,
  stage,
  totalStages,
  size = 120,
  strokeWidth = 10,
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  // Ensure offset doesn't go below 0
  const offset = Math.max(0, circumference - (progress / 100) * circumference);

  return (
    <div className="relative mb-4" style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          className="text-gray-700"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        {/* Progress arc */}
        <circle
          className="text-white"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s linear',
          }}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {stage > 0 && totalStages > 0 ? `${stage}/${totalStages}` : ''}
        </span>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [phoneData, setPhoneData] = useState<Phone[]>([]); // Changed from PHONE_DATA
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingList, setIsGeneratingList] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [totalStages, setTotalStages] = useState<number>(0);
  const [currentStageText, setCurrentStageText] = useState<string>('');
  const [visualProgress, setVisualProgress] = useState<number>(0);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<string>('');
  const [isLiveModalOpen, setIsLiveModalOpen] = useState<boolean>(false);
  const [userCountry, setUserCountry] = useState<string>('Nigeria');
  
  const progressIntervalRef = useRef<number | null>(null); // Kept for safety, though not actively used in new list generation progress.
  const { theme, toggleTheme } = useTheme();
  
  const { reviews, getReviewsForPhone, addReview, getAverageRatingForPhone } = useReviews();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [phoneForReview, setPhoneForReview] = useState<Phone | null>(null);

  const prices = useMemo(() => phoneData
    .map(p => p.Price)
    .filter((p): p is number => typeof p === 'number'), [phoneData]);
  
  const minPrice = useMemo(() => prices.length ? Math.min(...prices) : 0, [prices]);
  const maxPrice = useMemo(() => prices.length ? Math.max(...prices) : 1000000, [prices]);

  const [filters, setFilters] = useState({
    searchTerm: '',
    priceRange: [minPrice, maxPrice],
    hasWirelessCharging: false,
    has35mmJack: false,
  });

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const country = await getCountryFromCoords(position.coords.latitude, position.coords.longitude);
                    if (country) {
                        setUserCountry(country);
                        console.log(`User country detected: ${country}`);
                    }
                } catch (e) {
                    console.warn("Could not determine user country from location.", e);
                }
            },
            () => {
                console.warn("Geolocation permission denied. Defaulting to Nigeria for pricing.");
            }
        );
    } else {
        console.warn("Geolocation is not supported by this browser. Defaulting to Nigeria for pricing.");
    }
  }, []);

  useEffect(() => {
    setFilters({
      searchTerm: '',
      priceRange: [minPrice, maxPrice],
      hasWirelessCharging: false,
      has35mmJack: false,
    });
  }, [minPrice, maxPrice, phoneData]);

  const handleSuggestionRequest = useCallback(async () => {
    if (!priorities.trim()) {
      setError('Please describe what you are looking for in a phone.');
      return;
    }
    if (phoneData.length === 0) {
      setError('The comparison list is empty. Please generate a list first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const result = await getPhoneRecommendations(priorities, phoneData);
      
      const primaryWithImage = {
        ...result.primary,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(result.primary.name)}/300/400`,
      };
      
      const runnerUpWithImage = result.runnerUp
        ? {
            ...result.runnerUp,
            imageUrl: `https://picsum.photos/seed/${encodeURIComponent(result.runnerUp.name)}/300/400`,
          }
        : null;

      setRecommendations({ primary: primaryWithImage, runnerUp: runnerUpWithImage });

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Sorry, I couldn't get a recommendation. Please try again. Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [priorities, phoneData]);

  const handleGenerateList = useCallback(async (description: string) => {
    if (!description.trim()) {
      setListError('Please describe the kind of phones you want to compare.');
      return;
    }
    
    clearAiLogs(); // Clear previous logs at the start of a new generation.

    setIsGeneratingList(true);
    setTotalStages(3); // Now 3 distinct stages
    setListError(null);
    setError(null);
    setRecommendations(null);
    setPhoneData([]);

    try {
      // --- Stage 1: Get Phone Constraints ---
      setCurrentStage(1);
      setVisualProgress(0);
      setCurrentStageText('Analyzing your request to understand your priorities...');
      const constraints = await getPhoneConstraints(description, userCountry);
      setVisualProgress(33); // Approximately one-third for stage 1
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for UX

      // --- Stage 2: Generate Phone List from Constraints ---
      setCurrentStage(2);
      setCurrentStageText('Identifying matching phones based on your criteria...');
      // Progress visually starts from where stage 1 left off
      setVisualProgress(33);
      const phoneNames = await generatePhoneListFromConstraints(constraints);
      
      if (phoneNames.length === 0) {
        throw new Error("The AI didn't return any phone suggestions for that description.");
      }
      setVisualProgress(66); // Approximately two-thirds for stage 2
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for UX

      // --- Stage 3: Fetch Specs for Each Phone (Iterative) ---
      setCurrentStage(3);
      setCurrentStageText(`Fetching specs for all ${phoneNames.length} phones...`);
      // Progress visually starts from where stage 2 left off
      setVisualProgress(66); 
      const allPhoneSpecs: Phone[] = [];
      // Remaining 34% of progress divided by number of phones
      const progressChunk = (100 - 66) / phoneNames.length; 

      for (let i = 0; i < phoneNames.length; i++) {
        const phoneName = phoneNames[i];
        setCurrentStageText(`Fetching specs for (${i + 1}/${phoneNames.length}): ${phoneName}...`);
        try {
          const phoneSpec = await getSpecsForPhone(phoneName, userCountry);
          allPhoneSpecs.push(phoneSpec);
        } catch (individualPhoneError) {
          console.warn(`Failed to fetch specs for ${phoneName}:`, individualPhoneError);
          // Optionally, add a placeholder phone or handle as a skipped item
        }
        // Update visual progress incrementally
        setVisualProgress(66 + (i + 1) * progressChunk);
        // Add a small delay to make the progress visible for each phone
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setCurrentStageText(`Finalizing and compiling all ${allPhoneSpecs.length} specifications...`);
      setVisualProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500)); // Final delay for UX

      setPhoneData(allPhoneSpecs);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setListError(`Failed to generate the phone list. Please try a different description. Error: ${errorMessage}`);
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsGeneratingList(false);
      setCurrentStage(0);
      setTotalStages(0);
      setCurrentStageText('');
      setVisualProgress(0);
    }
  }, [userCountry]);

  const openReviewModalFor = (phone: Phone) => {
    setPhoneForReview(phone);
    setIsReviewModalOpen(true);
  };

  const handleAddReview = (review: Omit<Review, 'author'>) => {
    if (phoneForReview) {
      addReview(phoneForReview.Name, { ...review, author: 'Anonymous' });
    }
  };

  const filteredPhones = useMemo(() => {
    if (phoneData.length === 0) return [];
    return phoneData.filter(phone => {
      const [min, max] = filters.priceRange;
      const priceMatch = typeof phone.Price !== 'number' || (phone.Price >= min && phone.Price <= max);
      const searchTermMatch = phone.Name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const wirelessChargingMatch = !filters.hasWirelessCharging || phone["Wireless Charging"] === true;
      const jackMatch = !filters.has35mmJack || phone["3.5mm Jack"] === true;
      return priceMatch && searchTermMatch && wirelessChargingMatch && jackMatch;
    });
  }, [phoneData, filters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-sans">
      {isGeneratingList && (
         <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white p-4">
            <CircularProgressBar 
                progress={visualProgress} 
                stage={currentStage} 
                totalStages={totalStages} 
            />
            <h2 className="text-2xl font-bold text-center mt-2">Generating Your Custom Phone List...</h2>
            <p className="mt-2 text-lg text-center text-gray-300 max-w-xl">
              {currentStageText || 'Please wait, this may take a moment.'}
            </p>
         </div>
      )}
      <header className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              AI Phone Recommender
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Compare specs and get personalized recommendations powered by Gemini.
            </p>
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
            <UserInput
              isLoading={isLoading}
              onSubmit={handleSuggestionRequest}
              priorities={priorities}
              setPriorities={setPriorities}
              onOpenLiveChat={() => setIsLiveModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-3">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <RecommendationSection
              recommendations={recommendations}
              isLoading={isLoading}
              getAverageRatingForPhone={getAverageRatingForPhone}
            />
          </div>
        </div>

        <section className="mt-12">
           <ListGenerator 
             onSubmit={handleGenerateList} 
             isLoading={isGeneratingList}
             currentStage={currentStage}
             totalStages={totalStages}
             currentStageText={currentStageText}
           />
           {listError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-6" role="alert">
                <strong className="font-bold">List Generation Error: </strong>
                <span className="block sm:inline">{listError}</span>
              </div>
            )}
          <div className="flex flex-col md:flex-row justify-between md:items-center mt-8 mb-4 gap-4">
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Phone Specification Comparison</h2>
          </div>
          <Filters 
            filters={filters} 
            setFilters={setFilters}
            minPrice={minPrice}
            maxPrice={maxPrice}
            disabled={phoneData.length === 0}
          />
          <PhoneComparisonTable 
            phones={filteredPhones} 
            specs={PHONE_SPECS} 
            onAddReview={openReviewModalFor}
            getAverageRatingForPhone={getAverageRatingForPhone}
          />
        </section>
      </main>

      <footer className="bg-white dark:bg-gray-900 mt-12 py-6">
        <div className="container mx-auto text-center text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} AI Phone Recommender. All rights reserved.</p>
          <button
            onClick={() => {
                const logs = getAiLogs();
                if (logs.length === 0) {
                  alert('No AI debug logs found. Generate a list first.');
                  return;
                }
                console.log("===== AI DEBUG LOG =====");
                console.log(logs);
                alert('AI debug logs have been printed to the developer console (F12).');
            }}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            View Debug Log in Console
          </button>
        </div>
      </footer>
      
      {phoneForReview && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          phoneName={phoneForReview.Name}
          onSubmit={handleAddReview}
        />
      )}

      <LiveRecommendationModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        onComplete={(summary) => {
            setPriorities(summary);
            setIsLiveModalOpen(false);
        }}
       />

      {!isChatOpen && <ChatBubble onClick={() => setIsChatOpen(true)} />}
      <ChatWindow 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        phoneData={phoneData}
      />
    </div>
  );
};

export default App;
