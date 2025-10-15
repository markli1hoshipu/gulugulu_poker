import { useState, useEffect, useCallback } from "react";
import { Users, Bell, Bot, ChevronLeft, ChevronRight, Mail, MessageSquare, Phone, Star, ChevronUp, ChevronDown, Newspaper, ExternalLink, Clock, TrendingUp, Globe, Briefcase, Search, Filter, Loader2, Factory, RotateCcw } from "lucide-react";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Select, SelectItem } from "../../ui/select";
import { Card, CardContent } from "../../ui/card";
import { motion } from 'framer-motion';
import { fetchDailyNews, searchNewsByKeywords, getUserIndustries } from '../../../services/newsApi';
import IndustrySelector from './IndustrySelector';
import NewsDetailsModal from './NewsDetailsModal';
import MeetingDetailsModal from './MeetingDetailsModal';


const MEETINGS_PER_PAGE = 3;
const ARTICLES_PER_PAGE = 5;

const AIAgentsPanel = () => {
  // Multi-channel notifications data
  const multiChannelNotifications = [
    {
      id: "n1",
      source: "gmail",
      title: "Project Budget Approval Needed",
      content: "Finance team requires your approval for Q4 marketing budget. Please review and respond by EOD.",
      sender: "Sarah Chen",
      senderEmail: "sarah.chen@company.com",
      time: "2 minutes ago",
      priority: "high",
      unread: true,
      category: "work",
      favorite: false
    },
    {
      id: "n2",
      source: "slack",
      title: "Engineering Team",
      content: "@james The deployment is ready for review. Can you check the staging environment when you have a moment?",
      sender: "Mike Johnson",
      channel: "#engineering",
      time: "5 minutes ago",
      priority: "medium",
      unread: true,
      category: "work",
      favorite: true
    },
    {
      id: "n3",
      source: "phone",
      title: "Missed Call",
      content: "Missed call from client about project timeline. Left voicemail requesting callback.",
      sender: "Alex Rivera",
      phoneNumber: "+1 (555) 123-4567",
      time: "15 minutes ago",
      priority: "high",
      unread: true,
      category: "client",
      favorite: false
    },
    {
      id: "n4",
      source: "sms",
      title: "Meeting Reminder",
      content: "Reminder: Product demo with TechCorp at 3:00 PM today. Conference room A.",
      sender: "Calendar Assistant",
      time: "30 minutes ago",
      priority: "medium",
      unread: false,
      category: "meeting",
      favorite: false
    },
    {
      id: "n5",
      source: "slack",
      title: "Marketing Team",
      content: "Great job on the campaign launch! Engagement is up 40% already 🚀",
      sender: "Lisa Park",
      channel: "#marketing",
      time: "45 minutes ago",
      priority: "low",
      unread: false,
      category: "achievement",
      favorite: true
    }
  ];

  const [activeTab, setActiveTab] = useState('notifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notifications, setNotifications] = useState(multiChannelNotifications);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // News state
  const [newsItems, setNewsItems] = useState([]);
  const [allNewsItems, setAllNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('Please select industries to view relevant news');
  const [lastNewsUpdate, setLastNewsUpdate] = useState(null);

  // News search state
  const [searchKeywords, setSearchKeywords] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // News filter state
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Industry selection state
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [showIndustrySelector, setShowIndustrySelector] = useState(true);

  // News pagination state
  const [newsCurrentPage, setNewsCurrentPage] = useState(1);
  const [displayedArticles, setDisplayedArticles] = useState([]);

  // News modal state
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // Meeting Agent State
  const [isZoomConnected, setIsZoomConnected] = useState(false);
  const [zoomUser, setZoomUser] = useState(null);
  const [connectingToZoom, setConnectingToZoom] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [hasClickedConnect, setHasClickedConnect] = useState(false);

  // Meeting Data State
  const [meetingSummaries, setMeetingSummaries] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  // News filter options
  const filterOptions = [
    { value: 'all', label: 'All News', icon: '📰' },
    { value: 'trending', label: 'Trending', icon: '🔥' },
    { value: 'mainstream', label: 'Mainstream Sources', icon: '📡' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'technology', label: 'Technology', icon: '💻' },
    { value: 'recent', label: 'Recent (24h)', icon: '⏰' },
    { value: 'international', label: 'International', icon: '🌍' }
  ];

  // Apply filters to news items
  const applyNewsFilter = (articles, filter) => {
    if (!articles || articles.length === 0) return [];

    switch (filter) {
      case 'all':
        return articles;
      case 'trending':
        return articles.filter(article => article.trending);
      case 'mainstream':
        return articles.filter(article => {
          const source = article.source.toLowerCase();
          return ['cnn', 'bbc', 'reuters', 'techcrunch', 'cnbc', 'wired', 'guardian'].some(s => source.includes(s));
        });
      case 'business':
        return articles.filter(article =>
          article.category === 'business' ||
          article.title.toLowerCase().includes('business') ||
          article.summary.toLowerCase().includes('business')
        );
      case 'technology':
        return articles.filter(article =>
          article.category === 'technology' ||
          article.title.toLowerCase().includes('tech') ||
          article.title.toLowerCase().includes('ai') ||
          article.summary.toLowerCase().includes('technology')
        );
      case 'recent':
        return articles.filter(article => {
          const timeText = article.time.toLowerCase();
          return timeText.includes('hour') || timeText.includes('minute') || timeText.includes('just now');
        });
      case 'international':
        return articles.filter(article => {
          const source = article.source.toLowerCase();
          const title = article.title.toLowerCase();
          const summary = article.summary.toLowerCase();
          return ['bbc', 'reuters', 'guardian', 'international', 'global', 'world'].some(s =>
            source.includes(s) || title.includes(s) || summary.includes(s)
          );
        });
      default:
        return articles;
    }
  };

  // Fetch news data
  const fetchNews = async (category = 'business', forceRefresh = false) => {
    if (newsLoading && !forceRefresh) return;

    setNewsLoading(true);
    setNewsError(null);

    try {
      // If industries are selected, search by industry keywords instead of general news
      if (selectedIndustries.length > 0) {
        console.log('📰 Searching news by industries via Google News:', { industries: selectedIndustries, category, forceRefresh });

        // Create search keywords from selected industries with news-specific terms
        const industryKeywords = selectedIndustries.map(industry => {
          return `${industry} news OR ${industry} industry OR ${industry} market OR ${industry} business`;
        }).join(' OR ');

        console.log('🔍 Search keywords:', industryKeywords);

        const response = await searchNewsByKeywords(industryKeywords, 'general', 20);

        if (response.success && response.articles && response.articles.length > 0) {
          setAllNewsItems(response.articles);
          const filteredArticles = applyNewsFilter(response.articles, selectedFilter);
          setNewsItems(filteredArticles);
          setLastNewsUpdate(new Date().toISOString());
          console.log('📰 Industry-based Google News search completed:', response.articles.length, 'articles');
        } else {
          throw new Error(response.error || `No news articles found for industries: ${selectedIndustries.join(', ')}`);
        }
      } else {
        // No industries selected - show message to select industries
        console.log('📰 No industries selected, prompting user to select industries');
        setNewsItems([]);
        setAllNewsItems([]);
        setNewsError('Please select industries to view relevant news');
      }
    } catch (error) {
      console.error('📰 Error fetching news:', error);
      setNewsError(error.message || 'Failed to fetch news');
      setNewsItems([]);
      setAllNewsItems([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Handle industry selection change
  const handleIndustriesChange = (industries) => {
    setSelectedIndustries(industries);

    // Auto-fetch news when industries change
    if (industries.length > 0) {
      fetchNews('general', true); // Force refresh with new industries
    } else {
      // Clear news when no industries selected
      setNewsItems([]);
      setAllNewsItems([]);
      setNewsError('Please select industries to view relevant news');
    }
  };

  // Handle news search
  const handleNewsSearch = async (keywords) => {
    if (!keywords.trim()) return;

    setNewsLoading(true);
    setNewsError(null);
    setIsSearchMode(true);

    try {
      console.log('🔍 Searching news for:', keywords);
      const response = await searchNewsByKeywords(keywords, 'business', 20);

      if (response.success && response.articles && response.articles.length > 0) {
        setAllNewsItems(response.articles);
        const filteredArticles = applyNewsFilter(response.articles, selectedFilter);
        setNewsItems(filteredArticles);
        setLastNewsUpdate(new Date().toISOString());
        setNewsError(null);
        console.log('🔍 Search completed:', response.articles.length, 'articles found');
      } else {
        setAllNewsItems([]);
        setNewsItems([]);
        setNewsError(`No articles found for "${keywords}"`);
        console.warn('🔍 No articles found for keywords:', keywords);
      }
    } catch (error) {
      console.error('🔍 Error searching news:', error);
      setNewsError(error.message || 'Failed to search news');
      setNewsItems([]);
      setAllNewsItems([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterValue) => {
    setSelectedFilter(filterValue);
    setShowFilterDropdown(false);
    const filteredItems = applyNewsFilter(allNewsItems, filterValue);
    setNewsItems(filteredItems);
  };

  // Handle article click
  const handleNewsArticleClick = (article) => {
    setSelectedArticle(article);
    setIsNewsModalOpen(true);
  };

  // Handle AI summary request
  const handleGetAISummary = async (article) => {
    return `AI Summary for "${article.title}": This is a placeholder AI summary. The actual implementation would call an AI service to generate a summary of the article content.`;
  };

  // Update news pagination when filtered articles change
  useEffect(() => {
    const startIndex = (newsCurrentPage - 1) * ARTICLES_PER_PAGE;
    const endIndex = startIndex + ARTICLES_PER_PAGE;
    setDisplayedArticles(newsItems.slice(startIndex, endIndex));
  }, [newsItems, newsCurrentPage]);

  // Reset to first page when filter changes
  useEffect(() => {
    setNewsCurrentPage(1);
  }, [selectedFilter, isSearchMode]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Don't auto-load news - wait for user to select industries
  // useEffect(() => {
  //   fetchNews('business');
  // }, []);

  // AI Agent tabs: Meeting Agent, Notification Digest, and Daily News
  const tabs = [
    { id: 'meetings', label: 'Meeting Agent', icon: Users },
    { id: 'notifications', label: 'Notification Digest', icon: Bell },
    { id: 'news', label: 'Daily News', icon: Newspaper }
  ];

  // Fetch meeting summaries from Meeting Agent
  const fetchMeetingSummaries = useCallback(async () => {
    setMeetingsLoading(true);
    try {
      const response = await fetch(`${getMeetingAgentUrl()}/meetings/recent-summaries?limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.summaries) {
          setMeetingSummaries(data.summaries);
          console.log('📅 Fetched meeting summaries:', data.summaries.length, 'meetings');
        } else {
          console.warn('📅 No meeting summaries returned');
          setMeetingSummaries([]);
        }
      } else {
        console.error('📅 Failed to fetch meeting summaries:', response.status);
        setMeetingSummaries([]);
      }
    } catch (error) {
      console.error('📅 Error fetching meeting summaries:', error);
      setMeetingSummaries([]);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  // Fetch meetings when connected status changes
  useEffect(() => {
    if (isZoomConnected) {
      fetchMeetingSummaries();
    } else {
      setMeetingSummaries([]);
    }
  }, [isZoomConnected, fetchMeetingSummaries]);

  // Filter meetings based on search query
  const filteredMeetings = meetingSummaries.filter(meeting =>
    meeting.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (meeting.time && meeting.time.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle meeting click
  const handleMeetingClick = (meeting) => {
    setSelectedMeeting(meeting);
    setIsMeetingModalOpen(true);
  };

  // Pagination for recent meetings
  const totalPages = Math.ceil(filteredMeetings.length / MEETINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * MEETINGS_PER_PAGE;
  const paginatedMeetings = filteredMeetings.slice(startIndex, startIndex + MEETINGS_PER_PAGE);

  // Filter notifications based on source
  const filteredNotifications = notificationFilter === 'all'
    ? notifications
    : notifications.filter(notification => notification.source === notificationFilter);

  // Source icons and colors
  const sourceIcons = {
    gmail: Mail,
    slack: MessageSquare,
    phone: Phone,
    sms: MessageSquare
  };

  const sourceColors = {
    gmail: 'bg-red-50 text-red-600 border-red-200',
    slack: 'bg-purple-50 text-purple-600 border-purple-200',
    phone: 'bg-green-50 text-green-600 border-green-200',
    sms: 'bg-blue-50 text-blue-600 border-blue-200'
  };

  // Removed categoryColors since it was only used for news

  // Notification action handlers
  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, unread: false }
          : notif
      )
    );
  };

  const handleToggleFavorite = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, favorite: !notif.favorite }
          : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, unread: false }))
    );
  };


  // Meeting Agent URL
  const getMeetingAgentUrl = () => {
    return process.env.NODE_ENV === 'production'
      ? 'https://meeting-agent-prelude-platform-uc.a.run.app'
      : 'http://localhost:8004';
  };

  // Clear meeting cache function
  const clearMeetingCache = () => {
    // Clear the meeting cache from MeetingDetailsModal
    if (window.clearMeetingCache) {
      window.clearMeetingCache();
      console.log('🗑️ Meeting cache cleared');
    }
  };

  // Check Zoom connection status and refresh meetings
  const checkZoomConnection = useCallback(async () => {
    console.log('🔄 Refreshing Zoom connection status...');
    setCheckingConnection(true);
    
    // Clear meeting cache when refreshing
    clearMeetingCache();
    
    try {
      const response = await fetch(`${getMeetingAgentUrl()}/oauth/connection-status`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Connection status response:', data);
        setIsZoomConnected(data.connected);
        if (data.connected && data.user) {
          setZoomUser(data.user);
          console.log('👤 User connected:', data.user.name);
          // Refresh meetings when connected
          fetchMeetingSummaries();
        } else {
          setZoomUser(null);
          setHasClickedConnect(false); // Reset to show "Connect to Zoom" button again
          console.log('❌ No user connected');
        }
      } else {
        console.log('⚠️ Connection status check failed with status:', response.status);
        setIsZoomConnected(false);
        setZoomUser(null);
        setHasClickedConnect(false); // Reset to show "Connect to Zoom" button again
      }
    } catch (error) {
      console.error('Failed to check Zoom connection:', error);
      setIsZoomConnected(false);
      setZoomUser(null);
      setHasClickedConnect(false); // Reset to show "Connect to Zoom" button again
    } finally {
      setCheckingConnection(false);
      console.log('✅ Connection status check complete');
    }
  }, [fetchMeetingSummaries]);

  // Check connection on component mount
  useEffect(() => {
    checkZoomConnection();
  }, [checkZoomConnection]);

  // Handle Zoom connection
  const handleConnectToZoom = () => {
    setConnectingToZoom(true);
    setHasClickedConnect(true);

    // Open Zoom OAuth in new tab
    const meetingAgentUrl = getMeetingAgentUrl();
    window.open(`${meetingAgentUrl}/oauth/authorize`, '_blank');

    // Reset connecting state after a delay
    setTimeout(() => {
      setConnectingToZoom(false);
    }, 2000);
  };


  // Handle Zoom disconnect
  const handleDisconnectZoom = async () => {
    try {
      const response = await fetch(`${getMeetingAgentUrl()}/oauth/disconnect`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsZoomConnected(false);
        setZoomUser(null);
      } else {
        console.error('Failed to disconnect from Zoom');
      }
    } catch (error) {
      console.error('Failed to disconnect from Zoom:', error);
      // Still update UI even if API call fails
      setIsZoomConnected(false);
      setZoomUser(null);
    }
  };

  const renderMeetingContent = () => (
    <div className="space-y-6">
      {/* Meeting Agent Header with Refresh and Collapse Buttons */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Meeting Agent
        </h4>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={checkZoomConnection}
            disabled={checkingConnection}
            className="p-2 h-8 w-8 bg-blue-50 border border-blue-200 rounded-full shadow-sm hover:shadow-md"
            title="Refresh connection status"
          >
            {checkingConnection ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {!isZoomConnected ? (
            // Connection Page
            <div className="text-center py-8 space-y-6">
              {/* Zoom Logo and Connection Status */}
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Connect to Zoom</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Connect your Zoom account to manage meetings, view recordings, access
                    transcripts, and get AI-powered meeting summaries directly from your dashboard.
                  </p>
                </div>
              </div>


              {/* Connect Buttons */}
              <div className="space-y-3">
                {!hasClickedConnect ? (
                  /* Primary Connect Button */
                  <Button
                    onClick={handleConnectToZoom}
                    disabled={connectingToZoom}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-sm"
                  >
                    {connectingToZoom ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect to Zoom
                      </>
                    )}
                  </Button>
                ) : (
                  /* Refresh Button */
                  <Button
                    onClick={checkZoomConnection}
                    disabled={checkingConnection}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg shadow-sm"
                  >
                    {checkingConnection ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Refresh Status
                      </>
                    )}
                  </Button>
                )}

              </div>
            </div>
          ) : (
            // Connected State - Show meeting functionality
            <div className="space-y-4">
              {/* Connected Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    Connected to Zoom as {zoomUser?.name || 'User'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 ml-auto text-xs"
                    onClick={handleDisconnectZoom}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search meetings by name, date, or time..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 bg-gray-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Recent Meeting Summaries */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Recent Meeting Summaries
                </h4>

                {meetingsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading meetings...</p>
                  </div>
                ) : paginatedMeetings.length > 0 ? (
                  <>
                    {paginatedMeetings.map((meeting) => (
                      <Card
                        key={meeting.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleMeetingClick(meeting)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-semibold text-foreground">{meeting.meetingTitle}</h5>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span>{meeting.date}</span>
                                <span>•</span>
                                <span>{meeting.time}</span>
                                <span>•</span>
                                <span>{meeting.duration}</span>
                                <span>•</span>
                                <span>{meeting.attendees}</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">{meeting.summary}</p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Click to view full summary and recording</span>
                            <span className="text-primary">View Details →</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(startIndex + MEETINGS_PER_PAGE, filteredMeetings.length)} of {filteredMeetings.length} meetings
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground px-3">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? `No meetings found matching "${searchQuery}"` : 'No recent meetings found'}
                    {isZoomConnected && !meetingsLoading && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchMeetingSummaries}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Refresh Meetings
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
    </div>
  );

  const renderNotificationContent = () => (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Multi-Channel Notifications
        </h4>
        <div className="flex items-center gap-2">
          <Select value={notificationFilter} onValueChange={setNotificationFilter} className="w-32" size="sm">
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="gmail">Gmail</SelectItem>
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </Select>
          <button
            className="text-sm text-primary hover:text-primary/80"
            onClick={handleMarkAllAsRead}
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-800">AI Summary</span>
          </div>
          <p className="text-sm text-slate-700">
            You have <strong>{filteredNotifications.filter(n => n.unread).length} unread</strong> notifications across {notificationFilter === 'all' ? 'all channels' : notificationFilter}.
            {filteredNotifications.filter(n => n.priority === 'high').length > 0 && (
              <> <strong>{filteredNotifications.filter(n => n.priority === 'high').length} high-priority</strong> items need immediate attention.</>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Notifications Timeline */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const SourceIcon = sourceIcons[notification.source];
            return (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-sm ${
                  notification.unread ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Source Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${sourceColors[notification.source]}`}>
                      <SourceIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold text-foreground text-sm">{notification.title}</h5>

                            {/* Favorite Star */}
                            <button
                              onClick={() => handleToggleFavorite(notification.id)}
                              className="hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  notification.favorite
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground hover:text-yellow-400'
                                }`}
                              />
                            </button>

                            {/* Priority Badge */}
                            <Badge
                              variant={notification.priority === 'high' ? 'destructive' : notification.priority === 'medium' ? 'default' : 'secondary'}
                              className="text-xs px-1.5 py-0.5 h-5"
                            >
                              {notification.priority === 'high' ? 'High' : notification.priority === 'medium' ? 'Medium' : 'Low'}
                            </Badge>

                            {notification.unread && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>

                          {/* Source info */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <span className="capitalize font-medium">{notification.source}</span>
                            <span>•</span>
                            <span>{notification.sender}</span>
                            {notification.channel && (
                              <>
                                <span>•</span>
                                <span>{notification.channel}</span>
                              </>
                            )}
                            {notification.senderEmail && (
                              <>
                                <span>•</span>
                                <span>{notification.senderEmail}</span>
                              </>
                            )}
                            {notification.phoneNumber && (
                              <>
                                <span>•</span>
                                <span>{notification.phoneNumber}</span>
                              </>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{notification.content}</p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{notification.time}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {notification.category}
                              </Badge>
                              {notification.unread && (
                                <button
                                  className="text-xs text-primary hover:text-primary/80"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  Mark as Read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No notifications found for {notificationFilter === 'all' ? 'any source' : notificationFilter}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <Card className="border-t">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-foreground">
                {notifications.filter(n => n.source === 'gmail').length}
              </div>
              <div className="text-xs text-muted-foreground">Gmail</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                {notifications.filter(n => n.source === 'slack').length}
              </div>
              <div className="text-xs text-muted-foreground">Slack</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                {notifications.filter(n => n.source === 'phone').length}
              </div>
              <div className="text-xs text-muted-foreground">Phone</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                {notifications.filter(n => n.source === 'sms').length}
              </div>
              <div className="text-xs text-muted-foreground">SMS</div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-4 text-center mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {notifications.filter(n => n.favorite).length}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                Favorites
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {notifications.filter(n => n.priority === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNewsContent = () => {
    const totalPages = Math.ceil(newsItems.length / ARTICLES_PER_PAGE);
    const startIndex = (newsCurrentPage - 1) * ARTICLES_PER_PAGE + 1;
    const endIndex = Math.min(newsCurrentPage * ARTICLES_PER_PAGE, newsItems.length);

    const handlePreviousPage = () => {
      if (newsCurrentPage > 1) {
        setNewsCurrentPage(newsCurrentPage - 1);
      }
    };

    const handleNextPage = () => {
      if (newsCurrentPage < totalPages) {
        setNewsCurrentPage(newsCurrentPage + 1);
      }
    };

    return (
      <div className="space-y-4">
        {/* Header */}
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Daily News
        </h4>

        {/* Industry Selector */}
        {showIndustrySelector && (
          <div className="mb-4">
            <IndustrySelector
              userEmail="logan@preludeos.com"
              selectedIndustries={selectedIndustries}
              onIndustriesChange={handleIndustriesChange}
            />
          </div>
        )}

        {/* Industry Status Info */}
        {selectedIndustries.length > 0 && (
          <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
            <span className="flex items-center gap-2">
              <Factory className="w-3 h-3" />
              Industry search: {selectedIndustries.slice(0, 3).join(', ')}
              {selectedIndustries.length > 3 && ` +${selectedIndustries.length - 3} more`}
            </span>
            <button
              onClick={() => setSelectedIndustries([])}
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search Google News & RSS feeds..."
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNewsSearch(searchKeywords);
                }
              }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Search Button */}
          <Button
            size="sm"
            className="px-4"
            onClick={() => handleNewsSearch(searchKeywords)}
            disabled={newsLoading || !searchKeywords.trim()}
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>

          {/* Filter Dropdown */}
          <div className="relative filter-dropdown">
            <Button
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {filterOptions.find(f => f.value === selectedFilter)?.label || 'Filter'}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>

            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      selectedFilter === option.value ? 'bg-primary/10 text-primary' : 'text-gray-700'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    {selectedFilter === option.value && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            className="px-3"
            onClick={() => {
              if (isSearchMode) {
                setIsSearchMode(false);
                setSearchKeywords('');
                setSelectedFilter('all');
              }
              // Only refresh if industries are selected
              if (selectedIndustries.length > 0) {
                fetchNews('general', true);
              } else {
                setNewsError('Please select industries to view relevant news');
              }
            }}
            disabled={newsLoading}
          >
            {newsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Filter Results Info */}
        {selectedFilter !== 'all' && newsItems.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
            <span>
              Showing {newsItems.length} of {allNewsItems.length} articles
              • Filter: {filterOptions.find(f => f.value === selectedFilter)?.label}
            </span>
            <button
              onClick={() => handleFilterChange('all')}
              className="text-primary hover:text-primary/80 underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Loading State */}
        {newsLoading && newsItems.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Fetching latest news...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {newsError && newsItems.length === 0 && (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <Newspaper className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Failed to load news</p>
              <p className="text-xs text-gray-500 mt-1">{newsError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedIndustries.length > 0) {
                  fetchNews('general', true);
                } else {
                  setNewsError('Please select industries to view relevant news');
                }
              }}
              disabled={newsLoading}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* News Articles */}
        {displayedArticles.length > 0 && (
          <div className="space-y-3">
            {displayedArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    article.trending ? 'border-l-4 border-l-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleNewsArticleClick(article)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* News Image or Icon */}
                      {article.imageUrl ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Newspaper className="w-6 h-6 text-gray-400" />
                        </div>
                      )}

                      {/* News Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm leading-tight line-clamp-2">
                            {article.title}
                            {article.trending && (
                              <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                🔥 Trending
                              </span>
                            )}
                          </h4>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {article.summary}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{article.source}</span>
                            <span>•</span>
                            <span>{article.time}</span>
                            <span>•</span>
                            <span>{article.readTime}</span>
                          </div>
                          <span className="text-primary hover:text-primary/80">
                            Read More →
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {newsItems.length > ARTICLES_PER_PAGE && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex}-{endIndex} of {newsItems.length} articles
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={newsCurrentPage === 1}
                className="px-3"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground px-3">
                Page {newsCurrentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={newsCurrentPage === totalPages}
                className="px-3"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="hover:shadow-md transition-shadow bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">AI Agents Panel</h3>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md"
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </Button>
          </div>

          {/* Collapsed View */}
          {isCollapsed && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>AI Agents: Meeting Agent, Notifications & Daily News</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">
                  {notifications.filter(n => n.unread).length} unread notifications
                </span>
              </div>
            </div>
          )}

          {/* Expanded View */}
          {!isCollapsed && (
            <>
              {/* Tabs */}
          <div className="flex border-b border-slate-300 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="max-h-[500px] overflow-y-auto">
            {activeTab === 'meetings' ? renderMeetingContent() :
             activeTab === 'notifications' ? renderNotificationContent() :
             activeTab === 'news' ? renderNewsContent() :
             renderNewsContent()}
          </div>
          </>
        )}
        </CardContent>
      </Card>

      {/* News Details Modal */}
      <NewsDetailsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        article={selectedArticle}
        onGetAISummary={handleGetAISummary}
      />

      {/* Meeting Details Modal */}
      <MeetingDetailsModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        meetingId={selectedMeeting?.id}
        meeting={selectedMeeting}
      />
    </motion.div>
  );
};

export default AIAgentsPanel;
