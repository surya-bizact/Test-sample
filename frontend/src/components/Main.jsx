import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { 
  useSaveWallDesignsMutation,
  useGetWallDesignsQuery,
  useGetSessionsQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation
} from "../redux/apiSlice";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Canvas from "./Canvas";
import Room3D from "./Room3D";
import SessionModal from "./SessionModal";
import AlertModal from "./AlertModal";
import InputModal from "./InputModal";
import AdminPanel from "./AdminPanel";
import { API_BASE_URL } from '../config';
import "./Main.css";

// Helper to generate a random color (same as in Canvas.jsx)
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const Main = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [wallpaper, setWallpaper] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });
  const [canvasRef, setCanvasRef] = useState(null);
  const [isDownloadMode, setIsDownloadMode] = useState(false);
  const [roomType, setRoomType] = useState("");
  const [selectedWall, setSelectedWall] = useState("");
  const [roomDimensions, setRoomDimensions] = useState({
    length: 8,
    width: 8,
    height: 4
  });

  // 3D view state
  const [is3DView, setIs3DView] = useState(false);

  // Alert Modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false
  });

  // Input Modal state
  const [inputModal, setInputModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    defaultValue: '',
    placeholder: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel'
  });

  // Wall-specific design storage - initialized with empty designs for each wall
  const [wallDesigns, setWallDesigns] = useState({
    front: { elements: [], wallpaper: null },
    back: { elements: [], wallpaper: null },
    left: { elements: [], wallpaper: null },
    right: { elements: [], wallpaper: null }
  });

  // Show alert function - displays a modal with the given title, message, and options
  const showAlert = useCallback((title, message, type = 'info', options = {}) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        options.onConfirm?.();
      },
      onCancel: () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        options.onCancel?.();
      },
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      showCancel: options.showCancel || false
    });
  }, []);

  // Use ref to track current selectedWall without dependency issues
  const selectedWallRef = useRef(selectedWall);
  selectedWallRef.current = selectedWall;

  // Ensure selectedWallRef is always updated
  React.useEffect(() => {
    selectedWallRef.current = selectedWall;
  }, [selectedWall]);

  // Session management - handles all session-related state and API calls
  const { data: sessionsResponse, isLoading: isLoadingSessions, error: sessionError } = useGetSessionsQuery();
  
  // Debug log for sessions response
  useEffect(() => {
    console.log('Sessions API Response:', sessionsResponse);
  }, [sessionsResponse]);

  const sessions = useMemo(() => {
    if (!sessionsResponse) {
      console.log('No sessions response yet');
      return [];
    }
    
    // Handle both direct array response and response with sessions property
    const sessionsArray = Array.isArray(sessionsResponse) 
      ? sessionsResponse 
      : (sessionsResponse.sessions || []);
    
    console.log('Processing sessions array:', sessionsArray);
    
    const formatted = sessionsArray.map(session => {
      const formattedSession = {
        ...session,
        key: session.id || session._id,
        displayName: session.session_name || 'Untitled Session',
        saveDate: session.created_at || session.updated_at || new Date().toISOString(),
        roomType: session.room_type || 'Unknown',
        isUpdated: !!session.updated_at && session.updated_at !== session.created_at
      };
      console.log('Formatted session:', formattedSession);
      return formattedSession;
    });
    
    console.log('Formatted sessions:', formatted);
    return formatted;
  }, [sessionsResponse]); // Format sessions for display
  const [createSession] = useCreateSessionMutation();
  const [updateSession] = useUpdateSessionMutation();
  const [deleteSessionMutation] = useDeleteSessionMutation();
  const [loadedSessionKey, setLoadedSessionKey] = useState(null);
  const [loadedSessionName, setLoadedSessionName] = useState('');
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load session from backend
  const { data: sessionData, error: sessionLoadError, isFetching: isSessionLoading } = useGetSessionQuery(loadedSessionKey, {
    skip: !loadedSessionKey,
  });

  // Log session loading state changes
  useEffect(() => {
    console.log('Session loading state:', { 
      loadedSessionKey, 
      isSessionLoading, 
      hasSessionData: !!sessionData,
      sessionLoadError
    });
  }, [loadedSessionKey, isSessionLoading, sessionData, sessionLoadError]);

  // Process and apply session data when loaded
  useEffect(() => {
    if (!loadedSessionKey) {
      console.log('No session key provided, skipping session load');
      return;
    }

    if (sessionLoadError) {
      console.error('Session load error:', {
        error: sessionLoadError,
        status: sessionLoadError?.status,
        data: sessionLoadError?.data
      });
      showAlert('Error', 'Failed to load Session. Please try again.', 'error');
      setLoadedSessionKey(null); // Reset to allow retry
      setIsLoading(false);
      return;
    }

    if (!sessionData) {
      return; // Wait for data to load
    }

    const processSession = () => {
      try {
        console.log('Raw session data from API:', JSON.stringify(sessionData, null, 2));
        
        // Extract the session data (handling multiple possible response structures)
        const session = sessionData?.data?.session || sessionData?.session || sessionData;
        if (!session) {
          throw new Error('No session data found in response');
        }
        
        console.log('Processing session:', session);
        
        // 1. First update room type and dimensions
        const newRoomType = session.room_type || '';
        const newRoomDimensions = {
          length: session.room_dimensions?.length || 8,
          width: session.room_dimensions?.width || 8,
          height: session.room_dimensions?.height || 4
        };
        
        console.log('Updating room state:', { newRoomType, newRoomDimensions });
        
        // 2. Process wall designs with proper defaults
        const defaultWallDesign = { elements: [], wallpaper: null };
        const wallDesigns = {
          front: { ...defaultWallDesign, ...(session.wall_designs?.front || {}) },
          back: { ...defaultWallDesign, ...(session.wall_designs?.back || {}) },
          left: { ...defaultWallDesign, ...(session.wall_designs?.left || {}) },
          right: { ...defaultWallDesign, ...(session.wall_designs?.right || {}) }
        };
        
        console.log('Updating wall designs:', wallDesigns);
        
        // 3. Determine selected wall
        const selectedWall = session.selected_wall || 'front';
        const wallElements = wallDesigns[selectedWall]?.elements || [];
        
        // console.log(`Setting up UI for wall '${selectedWall}' with ${wallElements.length} elements`);
        
        // 4. Update all state in a single batch
        ReactDOM.unstable_batchedUpdates(() => {
          setRoomType(newRoomType);
          setRoomDimensions(newRoomDimensions);
          setWallDesigns(wallDesigns);
          setSelectedWall(selectedWall);
          setElements(wallElements);
          
          if (session.wallpaper) {
            console.log('Setting wallpaper:', session.wallpaper);
            setWallpaper(session.wallpaper);
          }
          
          // Close the modal after successful load
          setIsSessionModalOpen(false);
          showAlert('Success', `"${loadedSessionName}" Updated Successfully!`, 'success');
        });
        
        console.log('Session data applied successfully');
        
      } catch (error) {
        console.error('Error processing session data:', error);
        showAlert('Error', 'Failed to process session data. Please try again.', 'error');
        setLoadedSessionKey(null); // Reset to allow retry
        setIsLoading(false);
      }
    };
    
    processSession();
  }, [loadedSessionKey, sessionData, sessionLoadError, loadedSessionName, showAlert]);

  // RTK Query hooks for wall designs
  const [saveWallDesigns, { isLoading: isSaving }] = useSaveWallDesignsMutation();
  const { data: wallDesignsData, isLoading: isLoadingWallDesigns } = useGetWallDesignsQuery();

  // Function to save wall designs to backend
  const saveWallDesignsToBackend = useCallback(async (designs) => {
    try {
      await saveWallDesigns({
        wallDesigns: designs,
        roomType,
        roomDimensions,
        selectedWall
      }).unwrap();
    } catch (error) {
      console.error('Error saving wall designs to backend:', error);
    }
  }, [roomType, roomDimensions, selectedWall, saveWallDesigns]);

  // Load wall designs from backend on component mount
  useEffect(() => {
    if (wallDesignsData) {
      setWallDesigns(wallDesignsData.wallDesigns || []);
      setRoomType(wallDesignsData.roomType || "");
      setRoomDimensions(wallDesignsData.roomDimensions || { length: 8, width: 8, height: 4 });
      setSelectedWall(wallDesignsData.selectedWall || "");
    }
  }, [wallDesignsData]);

  // Save wall designs to backend whenever they change
  React.useEffect(() => {
    if (Object.keys(wallDesigns).length > 0) {
      // Debounce the save operation to prevent too many API calls
      const timeoutId = setTimeout(() => {
        saveWallDesignsToBackend(wallDesigns);
      }, 1000); // Wait 1 second before saving
      
      return () => clearTimeout(timeoutId);
    }
  }, [wallDesigns, saveWallDesignsToBackend]);

  // Define showInputModal first since it's used by other functions
  const showInputModal = useCallback((title, message, initialValue, onConfirm, onCancel) => {
    setInputModal({
      isOpen: true,
      title,
      message,
      defaultValue: initialValue,
      onConfirm: (value) => {
        setInputModal(prev => ({ ...prev, isOpen: false }));
        onConfirm?.(value);
      },
      onCancel: () => {
        setInputModal(prev => ({ ...prev, isOpen: false }));
        onCancel?.();
      },
      confirmText: 'Save',
      cancelText: 'Cancel'
    });
  }, []);

  // Function to save entire room design as session to backend
  const saveSession = useCallback(async (sessionName, options = {}) => {
    const { isNewSession = false } = options;
    
    if (!sessionName.trim()) {
      showAlert('Error', 'Session name cannot be empty', 'error');
      return false;
    }
    
    try {
      const sessionData = {
        session_name: sessionName,
        room_type: roomType,
        room_dimensions: roomDimensions,
        wall_designs: wallDesigns,
        selected_wall: selectedWall
      };
      
      let response;
      
      // For new sessions or when explicitly requested, always create a new session
      if (isNewSession || !loadedSessionKey) {
        response = await createSession(sessionData).unwrap();
        console.log('New session created successfully');
      } 
      // Otherwise update existing session
      else {
        response = await updateSession({
          sessionId: loadedSessionKey,
          ...sessionData
        }).unwrap();
        console.log('Session updated successfully');
      }
      
      if (response.session_id) {
        setLoadedSessionKey(response.session_id);
        setLoadedSessionName(sessionName);
        showAlert(
          'Success', 
          `Session "${sessionName}" ${isNewSession ? 'created' : 'updated'} successfully!`, 
          'success'
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving session:', error);
      showAlert(
        'Error', 
        `Failed to ${isNewSession ? 'create' : 'update'} session. Please try again.`,
        'error'
      );
      return false;
    }
  }, [roomType, roomDimensions, wallDesigns, selectedWall, loadedSessionKey, createSession, updateSession, showAlert]);

  // Handler for 'Save as New Session' button
  const handleSaveNewSession = useCallback(async () => {
    // Show input modal to get new session name
    return new Promise((resolve) => {
      showInputModal(
        'New Altar Design',
        'Enter a name for the Altar Design:',
        loadedSessionName ? `${loadedSessionName} (Copy)` : 'Altar Design',
        async (newName) => {
          const success = await saveSession(newName, { isNewSession: true });
          resolve(success);
        },
        () => resolve(false)
      );
    });
  }, [loadedSessionName, saveSession, showInputModal]);

  // Handler for 'Save Session' button
  const handleSaveSession = useCallback(async () => {
    // If no session is loaded, treat it as a new session
    if (!loadedSessionKey) {
      return handleSaveNewSession();
    }
    
    // For existing sessions, update with the current name
    return saveSession(loadedSessionName, { isNewSession: false });
  }, [loadedSessionKey, loadedSessionName, handleSaveNewSession, saveSession]);

  // Function to validate session data structure
  const validateSessionData = (data) => {
    if (!data) return false;
    return data.room_type !== undefined && 
           data.room_dimensions && 
           data.wall_designs;
  };

  // Function to load a specific session from backend
  const loadSession = useCallback(async (session) => {
    try {
      setIsLoading(true);
      console.log('Initiating session load for:', session);
      setLoadedSessionKey(session.key);
      setLoadedSessionName(session.displayName || 'Session');
    } catch (error) {
      console.error('Error initiating session load:', error);
      showAlert('Error', 'Failed to start loading session. Please try again.', 'error');
      setIsLoading(false);
    }
  }, []);
  
  // Reset loading state when session data is loaded
  useEffect(() => {
    if (sessionData && !isSessionLoading) {
      setIsLoading(false);
    }
  }, [sessionData, isSessionLoading]);

  // Function to delete a session from backend
  const handleDeleteSession = useCallback(async (session) => {
    try {
      await deleteSessionMutation(session.key).unwrap();
      console.log('Session deleted successfully:', session.displayName);
      
      // If the deleted session was the currently loaded one, clear it
      if (loadedSessionKey === session.key) {
        setLoadedSessionKey(null);
        setLoadedSessionName('');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [deleteSessionMutation, loadedSessionKey]);

  // Function to create new session (clear all walls)
  const newSession = useCallback(() => {
    showConfirmation(
      'Create New Altar',
      'Are you sure you want to create a new Altar? This will clear all current wall designs.',
      () => {
        // Reset room state to initial values
        setRoomType('');
        setSelectedWall('');
        setRoomDimensions({ length: 8, width: 8, height: 4 });
        // Clear all wall designs
        const emptyDesigns = {
          front: { elements: [], wallpaper: null },
          back: { elements: [], wallpaper: null },
          left: { elements: [], wallpaper: null },
          right: { elements: [], wallpaper: null }
        };
        setWallDesigns(emptyDesigns);
        // Clear current canvas
        setElements([]);
        setWallpaper(null);
        setLoadedSessionKey(null);
        setLoadedSessionName(null);
        console.log('New session started - all walls cleared');
        showAlert('Success', 'New session started! All walls have been cleared.', 'success');
      }
    );
  }, []);

  // Function to save as new session (force new session creation)
  const saveAsNewSession = useCallback(async () => {
    const defaultName = `${roomType || 'Room'} - ${new Date().toLocaleString()}`;
    
    showInputModal(
      'New Altar Design',
      'Enter a name for the new Altar Design:',
      defaultName,
      async (sessionName) => {
        if (!sessionName || !sessionName.trim()) {
          showAlert('Session Name Required', 'Session name is required. Save cancelled.', 'error');
          return;
        }

        try {
          const sessionData = {
            session_name: sessionName.trim(),
            room_type: roomType,
            room_dimensions: roomDimensions,
            wall_designs: wallDesigns,
            selected_wall: selectedWall
          };

          const response = await createSession(sessionData).unwrap();
          const sessionId = response.session_id;
          setLoadedSessionKey(sessionId);
          setLoadedSessionName(sessionName.trim());
          console.log('Room design saved as new session successfully');
          showAlert('Success', 'Room design saved as new session!', 'success');
        } catch (error) {
          console.error('Error saving room design as new session:', error);
          showAlert('Error', 'Error saving room design as new session. Please try again.', 'error');
        }
      }
    );
  }, [roomType, selectedWall, roomDimensions, wallDesigns, createSession]);

  // Callback to update canvas size from Canvas component
  const handleCanvasSize = useCallback((size) => {
    setCanvasSize(size);
  }, []);

  // Callback to get canvas ref from Canvas component
  const handleCanvasRef = useCallback((ref) => {
    setCanvasRef(ref);
  }, []);

  // Handle room type changes
  const handleRoomChange = useCallback((roomType) => {
    setRoomType(roomType);
  }, []);

  // Handle wall selection changes
  const handleWallChange = useCallback((wall) => {
    console.log('=== WALL CHANGE DEBUG ===');
    console.log('Switching to wall:', wall);
    console.log('Current wallDesigns state:', wallDesigns);
    console.log('Current wallpaper:', wallpaper);
    
    // Save current wall's state before switching
    if (selectedWall) {
      console.log('Saving state for wall:', selectedWall);
      setWallDesigns(prev => ({
        ...prev,
        [selectedWall]: {
          elements: [...elements],
          wallpaper: wallpaper // Make sure to save the current wallpaper
        }
      }));
    }
    
    // Set the new wall
    setSelectedWall(wall);
    
    // Load the new wall's design if it exists
    const wallDesign = wallDesigns[wall];
    console.log(`Wall design for ${wall}:`, wallDesign);
    
    if (wallDesign) {
      console.log('Loading existing design with elements:', wallDesign.elements);
      console.log('Loading wallpaper:', wallDesign.wallpaper);
      setElements(wallDesign.elements || []);
      setWallpaper(wallDesign.wallpaper || null);
    } else {
      console.log('Loading fresh canvas for new wall');
      setElements([]);
      setWallpaper(null);
    }
  }, [selectedWall, elements, wallpaper, wallDesigns]);

  // Handle dimension changes
  const handleDimensionsChange = useCallback((dimensions) => {
    setRoomDimensions(dimensions);
  }, []);

  // Save current design to wall storage
  const saveCurrentDesignToWall = useCallback(() => {
    console.log('Saving current design to wall:', selectedWall);
    console.log('Current elements:', elements);
    console.log('Current wallpaper:', wallpaper);
    
    setWallDesigns(prev => {
      const newDesigns = {
        ...prev,
        [selectedWall]: {
          elements: elements,
          wallpaper: wallpaper
        }
      };
      console.log('Updated wallDesigns:', newDesigns);
      return newDesigns;
    });
  }, [selectedWall, elements, wallpaper]);

  // Update elements and save to current wall
  const updateElements = useCallback((newElements) => {
    const actualElements = typeof newElements === 'function' ? newElements(elements) : newElements;

    if (!actualElements || !Array.isArray(actualElements)) {
      console.error('Invalid elements passed to updateElements:', newElements);
      return;
    }

    setElements(actualElements);

    setWallDesigns((prev) => {
      const updatedDesigns = {
        ...prev,
        [selectedWall]: {
          ...prev[selectedWall],
          elements: actualElements,
          wallpaper: prev[selectedWall]?.wallpaper || null,
        },
      };
      return updatedDesigns;
    });
  }, [selectedWall, elements]);

  // Update wallpaper and save to current wall
  const updateWallpaper = useCallback((newWallpaper) => {
    console.log('=== UPDATE WALLPAPER DEBUG ===');
    console.log('Updating wallpaper for wall:', selectedWall);
    console.log('New wallpaper:', newWallpaper);
    
    // Update the local state
    setWallpaper(newWallpaper);
    
    // Update the wall designs with the new wallpaper
    setWallDesigns(prev => {
      const updatedDesigns = {
        ...prev,
        [selectedWall]: {
          ...prev[selectedWall],
          elements: prev[selectedWall]?.elements || [],
          wallpaper: newWallpaper
        }
      };
      console.log('Updated wallDesigns after wallpaper change:', updatedDesigns);
      return updatedDesigns;
    });
  }, [selectedWall]);

  // Effect to handle wall changes
  useEffect(() => {
    // When selected wall changes, update elements and wallpaper from wallDesigns
    const wallDesign = wallDesigns[selectedWall] || {};
    console.log('Wall changed to:', selectedWall);
    console.log('Loading design for wall:', wallDesign);
    
    // Update local state with the design for the current wall
    setElements(wallDesign.elements || []);
    setWallpaper(wallDesign.wallpaper || null);
    
    // Log the current wall designs for debugging
    console.log('Current wall designs:', wallDesigns);
  }, [selectedWall, wallDesigns]);

  // Update canvas size on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setTimeout(() => setCanvasSize((prev) => ({ ...prev })), 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debug effect to track wallDesigns changes
  React.useEffect(() => {
    console.log('wallDesigns state changed:', wallDesigns);
  }, [wallDesigns]);

  // Debug effect to track elements changes
  React.useEffect(() => {
    console.log('Elements state changed:', elements);
    console.log('Elements length:', elements.length);
  }, [elements]);

  const STICKER_CATEGORIES = {
    Flowers: [
      "/images/flower1.png",
      "/images/flower2.png",
      "/images/flower3.png",
      "/images/flower4.png",
      "/images/flower5.png",
      "/images/flower6.png",
      "/images/flower7.png",
      "/images/flower8.png",
    ],
    Garlands: [
      "/images/garland1.png",
      "/images/garland2.png",
      "/images/garland3.png",
      "/images/garland4.png",
      "/images/garland5.png",
      "/images/garland6.png",
      "/images/garland7.png",
      "/images/garland8.png",
      "/images/garland9.png",
      "/images/garland10.png",
      "/images/garland11.png",
    ],
    Candles: [
      "/images/candle1.png",
      "/images/candle2.png",
      "/images/candle3.png",
      "/images/candle4.png",
    ],
    Incense: [
      "/images/Intensestick1.png",
      "/images/Intensestick2.png",
      "/images/Intensestick3.png",
      "/images/Intensestick4.png",
      "/images/Intensestick5.png",
    ],
    "Wall Decorations": [
      "/images/walldecor1.png",
      "/images/walldecor2.png",
      "/images/walldecor3.png",
      "/images/walldecor4.png",
      "/images/walldecor5.png",
      "/images/walldecor6.png",
      "/images/walldecor7.png",
      "/images/walldecor8.png",
      "/images/walldecor9.png",
      "/images/walldecor10.png",
      "/images/walldecor11.png",
      "/images/walldecor12.png",
      "/images/walldecor13.png",
      "/images/walldecor14.png",
      "/images/walldecor15.png",
      "/images/walldecor16.png",
    ],
    Tables: [
      "/images/table1.png",
      "/images/table2.png",
      "/images/table3.png",
      "/images/table4.png",
      "/images/table5.png",
      "/images/table6.png",
      "/images/table7.png",
    ],
  };
  const STICKER_CATEGORY_LIST = Object.keys(STICKER_CATEGORIES);

  const addImage = () => {
    const newElement = {
      id: uuidv4(),
      type: "image",
      content: "/sample1.jpg",
      x: 50,
      y: 50,
      width: 200,
      height: 200,
    };
    updateElements([...elements, newElement]);
  };
  const handleLogout = async () => {
    try {
      await logout().unwrap();
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      onLogout();   // Clear user from React state
      navigate('/'); // Redirect to login or welcome
    }
  };
  const addSticker = (stickerPath = "/marigold3.png") => {
    const newElement = {
      id: uuidv4(),
      type: "sticker",
      content: stickerPath,
      x: 50,
      y: 50,
      width: 200,
      height: 200,
    };
    console.log('Adding sticker:', newElement);
    updateElements([...elements, newElement]);
  };

  const addFrame = (frameType) => {
    const newElement = {
      id: uuidv4(),
      type: "frame",
      frameType,
      content: null,
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      borderColor: getRandomColor(),
    };
    console.log('Adding frame:', newElement);
    updateElements([...elements, newElement]);
  };


  // Admin-specific functions
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const handleAdminPanel = () => {
    if (user.role === 'admin') {
      setIsAdminPanelOpen(true);
    } else {
      showAlert('Access Denied', 'Admin access required. Only admin users can access the admin panel.', 'error');
    }
  };


  // Function to show confirmation dialog
  const showConfirmation = (title, message, onConfirm, onCancel) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type: 'warning',
      showCancel: true,
      confirmText: 'Yes',
      cancelText: 'No',
      onConfirm: () => {
        onConfirm?.();
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        onCancel?.();
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Function to close input modal
  const closeInputModal = useCallback(() => {
    setInputModal(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  // Function to save entire room design as session to backend
  const saveRoomDesign = async (designName) => {
    // Ensure designName is a string and trim whitespace
    const name = typeof designName === 'string' ? designName.trim() : String(designName || '').trim();
    
    if (!name) {
      showAlert('Error', 'Please enter a name for your design', 'error');
      return;
    }

    try {
      const sessionData = {
        session_name: name,
        room_type: roomType,
        room_dimensions: roomDimensions,
        wall_designs: wallDesigns,
        selected_wall: selectedWall,
        elements: elements,
        wallpaper: wallpaper
      };

      if (loadedSessionKey) {
        // Update existing session
        await updateSession({ sessionId: loadedSessionKey, ...sessionData }).unwrap();
        showAlert('Success', 'Design updated successfully!', 'success');
      } else {
        // Create new session
        await createSession(sessionData).unwrap();
        showAlert('Success', 'Design saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving design:', error);
      showAlert('Error', 'Failed to save design. Please try again.', 'error');
    }
  };

  const deleteSession = async (session) => {
    try {
      await deleteSessionMutation(session.id).unwrap();
      showAlert('Success', 'Session deleted successfully!', 'success');
      
      // If the deleted session was the currently loaded one, reset the state
      if (loadedSessionKey === session.id) {
        setLoadedSessionKey(null);
        setLoadedSessionName('');
        setRoomType('');
        setRoomDimensions({ length: 8, width: 8, height: 4 });
        setWallDesigns({
          front: { elements: [], wallpaper: null },
          back: { elements: [], wallpaper: null },
          left: { elements: [], wallpaper: null },
          right: { elements: [], wallpaper: null }
        });
        setElements([]);
        setWallpaper(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      showAlert('Error', 'Failed to delete session. Please try again.', 'error');
    }
  };

  const openSessionModal = () => {
    setIsSessionModalOpen(true);
  };

  // Function to delete an element by ID
  const deleteElement = (elementId) => {
    if (!elementId) {
      console.error('Invalid element ID:', elementId);
      return;
    }

    updateElements((prev) => {
      const updatedElements = prev.filter((el) => el.id !== elementId);
      if (updatedElements.length === prev.length) {
        console.warn('Element not found for deletion:', elementId);
      }
      return updatedElements;
    });
  };

  const onDragStop = (e, d, el) => {
    updateElements((prev) =>
      prev.map((item) =>
        item.id === el.id ? { ...item, x: d.x, y: d.y } : item
      )
    );
  };

  return (
    <div className="app-container">
      {/* Loading Overlay */}
      {isLoadingSessions && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading session "{loadedSessionName}"...</p>
        </div>
      )}
      
      <Header 
        loadRoomDesign={openSessionModal} 
        newSession={newSession} 
        user={user}
        onLogout={handleLogout}
        onAdminPanel={handleAdminPanel}
      />
      <div className="content-area">
        <div className="sidebar-container">
          <Sidebar
            addFrame={addFrame}
            addSticker={addSticker}
            stickers={STICKER_CATEGORIES}
            stickerCategories={STICKER_CATEGORY_LIST}
            setWallpaper={updateWallpaper}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            canvasRef={canvasRef}
            wallpaper={wallpaper}
            setIsDownloadMode={setIsDownloadMode}
            elements={elements}
            onRoomChange={handleRoomChange}
            onWallChange={handleWallChange}
            onDimensionsChange={handleDimensionsChange}
            selectedRoom={roomType}
            selectedWall={selectedWall}
            dimensions={roomDimensions}
            wallDesigns={wallDesigns}
            saveRoomDesign={handleSaveSession}
            saveAsNewSession={handleSaveNewSession}
          />
        </div>
        <div className="canvas-container">
          {/* 3D View Toggle Button */}
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            zIndex: 1000,
            background: '#f8ac8c',
          }}>
            <button
              className="view-toggle-btn"
              onClick={() => setIs3DView(!is3DView)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c5ce7 !important',
                background: '#6c5ce7 !important',
                color: 'black',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#5a4fcf';
                e.target.style.background = '#5a4fcf';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#6c5ce7';
                e.target.style.background = '#6c5ce7';
              }}
              title={is3DView ? 'Switch to 2D View' : 'Switch to 3D View'}
            >
              {is3DView ? '🖼️ 2D View' : '🏠 3D View'}
            </button>
          </div>
          
          {is3DView ? (
            <Room3D
              dimensions={roomDimensions}
              roomType={roomType}
              wallDesigns={wallDesigns}
            />
          ) : (
            <Canvas
              elements={elements}
              setElements={updateElements}
              selectedElementId={selectedElementId}
              setSelectedElementId={setSelectedElementId}
              wallpaper={wallpaper}
              onCanvasSize={handleCanvasSize}
              onCanvasRef={handleCanvasRef}
              isDownloadMode={isDownloadMode}
              roomType={roomType}
              selectedWall={selectedWall}
              roomDimensions={roomDimensions}
              onDragStop={onDragStop}
            />
          )}
        </div>
      </div>
      
      {/* Session Modal */}
      <SessionModal
        sessions={sessions}
        onLoadSession={loadSession}
        onDeleteSession={handleDeleteSession}
        onClose={() => setIsSessionModalOpen(false)}
        isOpen={isSessionModalOpen}
        isLoading={isLoadingSessions}
      />

      {/* Input Modal */}
      {inputModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-2">{inputModal.title}</h3>
            {inputModal.message && <p className="mb-4 text-gray-600">{inputModal.message}</p>}
            <input
              type="text"
              className="w-full p-2 border rounded mb-4"
              placeholder={inputModal.placeholder}
              defaultValue={inputModal.defaultValue}
              ref={input => input && input.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputModal.onConfirm) {
                  inputModal.onConfirm(e.target.value);
                  closeInputModal();
                } else if (e.key === 'Escape') {
                  closeInputModal();
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeInputModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('.modal-input');
                  if (input && inputModal.onConfirm) {
                    inputModal.onConfirm(input.value);
                    closeInputModal();
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {isAdminPanelOpen && (
        <AdminPanel
          user={user}
          onClose={() => setIsAdminPanelOpen(false)}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onConfirm={alertModal.onConfirm}
        onCancel={alertModal.onCancel}
        confirmText={alertModal.confirmText}
        cancelText={alertModal.cancelText}
        showCancel={alertModal.showCancel}
      />

      {/* Input Modal */}
      <InputModal
        isOpen={inputModal.isOpen}
        title={inputModal.title}
        message={inputModal.message}
        defaultValue={inputModal.defaultValue}
        placeholder={inputModal.placeholder}
        onConfirm={inputModal.onConfirm}
        onCancel={inputModal.onCancel}
        confirmText={inputModal.confirmText}
        cancelText={inputModal.cancelText}
      />
    </div>
  );
};

export default Main;