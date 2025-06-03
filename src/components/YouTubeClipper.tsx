
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Play, Download, Upload, Scissors, MessageSquare, FileVideo, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthForm from '@/components/auth/AuthForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const YouTubeClipper = () => {
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState('');
  const { toast } = useToast();

  const processingSteps = [
    { icon: Download, label: "Downloading video", description: "Fetching from YouTube..." },
    { icon: MessageSquare, label: "Transcribing audio", description: "Converting speech to text..." },
    { icon: Scissors, label: "AI Analysis", description: "Finding relevant segments..." },
    { icon: FileVideo, label: "Creating clips", description: "Generating final video..." }
  ];

  const handleProcess = async () => {
    if (!youtubeUrl || !userPrompt || !user) return;
    
    setIsProcessing(true);
    setProcessingStep(0);
    
    try {
      // Create a video job in the database
      const { data: jobData, error: jobError } = await supabase
        .from('video_jobs')
        .insert({
          user_id: user.id,
          youtube_url: youtubeUrl,
          user_prompt: userPrompt,
          status: 'processing'
        })
        .select()
        .single();

      if (jobError) {
        throw jobError;
      }

      console.log('Created video job:', jobData);

      // Simulate processing steps for now
      for (let i = 0; i < processingSteps.length; i++) {
        setProcessingStep(i);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const response = await fetch('http://localhost:5000/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: youtubeUrl, user_prompt: userPrompt })
      });

      if (!response.ok) {
        throw new Error('Video processing failed');
      }

      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      // Update job status to completed
      await supabase
        .from('video_jobs')
        .update({ status: 'completed' })
        .eq('id', jobData.id);

      setProcessedVideoUrl(videoUrl);
      
      toast({
        title: "Video Processing Complete!",
        description: "Your AI-generated clips are ready.",
      });
      
    } catch (error) {
      console.error('Error processing video:', error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "There was an error processing your video. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleAuthSuccess = () => {
    // This will trigger a re-render when auth state changes
    console.log('Authentication successful');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with User Info */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className="flex items-center justify-center">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-full">
                <Scissors className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">{user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="bg-white/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            AI Video Clipper
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform any YouTube video into personalized clips using AI. Just paste a link, describe what you're looking for, and let our AI find the perfect moments.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Input Section */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-red-500" />
                YouTube Video URL
              </CardTitle>
              <CardDescription>
                Paste the URL of the YouTube video you want to process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="flex-1"
                />
                {youtubeUrl && (
                  <Badge variant={isValidYouTubeUrl(youtubeUrl) ? "default" : "destructive"}>
                    {isValidYouTubeUrl(youtubeUrl) ? "Valid" : "Invalid"}
                  </Badge>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">What are you looking for?</label>
                <Textarea
                  placeholder="Describe what part of the video you want to find. For example: 'Find all the funny moments' or 'Extract the main points about climate change' or 'Get the tutorial steps for cooking pasta'"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleProcess}
                disabled={!youtubeUrl || !userPrompt || !isValidYouTubeUrl(youtubeUrl) || isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 text-lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Create AI Clips
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {isProcessing && (
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Processing Your Video</CardTitle>
                <CardDescription>
                  Please wait while we analyze and create your custom clips
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Progress value={(processingStep + 1) / processingSteps.length * 100} className="w-full" />
                
                <div className="space-y-4">
                  {processingSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === processingStep;
                    const isCompleted = index < processingStep;
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-blue-50 border border-blue-200'
                            : isCompleted
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${
                            isActive
                              ? 'bg-blue-500 text-white'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{step.label}</p>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                        {isActive && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result Video */}
          {processedVideoUrl && !isProcessing && (
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="h-5 w-5 text-green-500" />
                  Your AI-Generated Clips
                </CardTitle>
                <CardDescription>
                  Your personalized video clips are ready!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    controls
                    className="w-full aspect-video"
                    poster="/placeholder.svg"
                  >
                    <source src={processedVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setYoutubeUrl('');
                      setUserPrompt('');
                      setProcessedVideoUrl('');
                    }}
                  >
                    Create New Clips
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-2">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Smart Download</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Automatically downloads the highest quality version of any YouTube video.</p>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-2">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">AI Transcription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Uses advanced AI to accurately transcribe speech from videos in multiple languages.</p>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-2">
                  <Scissors className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Intelligent Clipping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Finds and combines the most relevant video segments based on your specific request.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeClipper;
