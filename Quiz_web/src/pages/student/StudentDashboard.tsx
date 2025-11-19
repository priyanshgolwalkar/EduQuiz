import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BookOpen, Award, Users, TrendingUp, Clock, Target, BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  title: string;
  description: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer'; // Added type
  totalPoints: number;
  timeLimit: number;
  classId: string;
  isPublished: boolean;
  createdAt: string;
  startTime: string; // Added startTime
  endTime: string; // Added endTime
  status: string; // Added status
}

interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalPoints: number; // Added totalPoints
  submittedAt: string; // Changed from completedAt to submittedAt
  timeTaken: number; // Changed from timeSpent to timeTaken
}

interface ClassEnrollment {
  id: string;
  studentId: string;
  classId: string;
  enrolledAt: string;
  className: string;
  teacherName: string;
}

interface StudentConnection {
  id: string;
  studentId: string;
  connectedStudentId: string;
  status: 'pending' | 'accepted';
  createdAt: string; // Changed from connectedAt to createdAt
}

interface DashboardStats {
  completedQuizzes: number;
  averageScore: number;
  totalClasses: number;
  totalConnections: number;
  totalTimeSpent: number;
  bestScore: number;
  recentImprovement: number;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    completedQuizzes: 0,
    averageScore: 0,
    totalClasses: 0,
    totalConnections: 0,
    totalTimeSpent: 0,
    bestScore: 0,
    recentImprovement: 0
  });
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassEnrollment[]>([]);

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API call failed: ${response.statusText}`);
    }
    return response.json();
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch enrollments first to determine if student has joined any classes
        const enrollments: ClassEnrollment[] = await fetchWithAuth(`/api/enrollments`);
        setClasses(enrollments);

        if (enrollments.length === 0) {
          // Student hasn't joined any classes, display empty dashboard state
          setStats({
            completedQuizzes: 0,
            averageScore: 0,
            totalClasses: 0,
            totalConnections: 0,
            totalTimeSpent: 0,
            bestScore: 0,
            recentImprovement: 0
          });
          setUpcomingQuizzes([]);
          setRecentAttempts([]);
          setIsLoading(false);
          return;
        }

        // Fetch student's attempts
        const attempts: QuizAttempt[] = await fetchWithAuth(`/api/attempts?isCompleted=true`);
        
        // Calculate statistics
        const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const totalPossiblePoints = attempts.reduce((sum, a) => sum + (a.totalPoints || 0), 0);
        const avgScore = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
        const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => (a.score / a.totalPoints) * 100 || 0)) : 0;
        const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0);

        // Fetch connections
        const connections: StudentConnection[] = await fetchWithAuth(`/api/connections`);
        
        setStats({
          completedQuizzes: attempts.length,
          averageScore: Math.round(avgScore),
          totalClasses: enrollments.length,
          totalConnections: connections.filter(c => c.status === 'accepted').length,
          totalTimeSpent: totalTimeSpent,
          bestScore: Math.round(bestScore),
          recentImprovement: 0 // Calculate based on recent attempts
        });

        setRecentAttempts(attempts.slice(0, 5));

        // Fetch upcoming quizzes for enrolled classes
        const classIds = enrollments.map(e => e.classId);
        const allQuizzes: Quiz[] = await fetchWithAuth(`/api/quizzes`);
          
        // Filter quizzes for student's classes and not attempted
        const attemptedQuizIds = attempts.map(a => a.quizId);
        const upcoming = allQuizzes
          .filter(q => classIds.includes(q.classId) && !attemptedQuizIds.includes(q.id) && (q.status === 'Upcoming' || q.status === 'Active'))
          .slice(0, 5);

        setUpcomingQuizzes(upcoming);

      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast.error(error.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatTimeSpent = (seconds: number) => { // Changed to seconds
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const handleDownloadGradeCard = async (classId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/grade-card/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate grade card');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `grade-card-${classId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Grade card downloaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download grade card');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h2>
          <p className="text-muted-foreground">Track your progress and ace your next quiz.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Today's Progress</p>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            <span className="text-lg font-semibold">{stats.averageScore}% Avg Score</span>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">You haven't joined any classroom yet.</h3>
            <p className="text-muted-foreground mb-4">Join a class to see your quizzes and progress here.</p>
            <Link to="/student/enroll">
              <Button size="lg" className="text-lg px-8">
                <Users className="mr-2 h-5 w-5" />
                Join a Classroom
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Enhanced Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed Quizzes</CardTitle>
                <BookOpen className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.completedQuizzes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.recentImprovement > 0 && `+${stats.recentImprovement}% improvement`}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.averageScore}%</div>
                <div className="mt-2">
                  <Progress value={stats.averageScore} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Best: {stats.bestScore}%</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Classes Enrolled</CardTitle>
                <Award className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.totalClasses}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {classes.slice(0, 2).map((cls, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {cls.className.split(' ')[0]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Study Time</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatTimeSpent(stats.totalTimeSpent)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total time spent</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upcoming Quizzes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Quizzes
                    </CardTitle>
                    <CardDescription>Quizzes you haven't taken yet</CardDescription>
                  </div>
                  <Link to="/student/quizzes">
                    <Button size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingQuizzes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No upcoming quizzes</p>
                    <p className="text-sm mt-1">Check back later for new assignments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingQuizzes.map((quiz) => (
                      <div key={quiz.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <h4 className="font-medium">{quiz.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {quiz.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {quiz.totalPoints} pts
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {quiz.timeLimit} min
                            </span>
                          </div>
                        </div>
                        <Link to={`/student/quiz/${quiz.id}`}>
                          <Button size="sm" className="ml-3">
                            Start
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Attempts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Recent Attempts
                    </CardTitle>
                    <CardDescription>Your latest quiz performances</CardDescription>
                  </div>
                  <Link to="/student/quizzes">
                    <Button size="sm" variant="outline">History</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentAttempts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No attempts yet</p>
                    <p className="text-sm mt-1">Take your first quiz to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAttempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={attempt.score >= (attempt.totalPoints * 0.8) ? "default" : attempt.score >= (attempt.totalPoints * 0.6) ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {((attempt.score / attempt.totalPoints) * 100).toFixed(0)}%
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(attempt.submittedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {attempt.timeTaken} minutes
                          </p>
                        </div>
                        <Link to={`/student/quiz/${attempt.quizId}/review`}>
                          <Button size="sm" variant="ghost">
                            Review
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and resources to help you succeed</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Link to="/student/quizzes" className="block">
                <Button variant="outline" className="w-full justify-start hover:bg-primary hover:text-primary-foreground">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Take Quiz
                </Button>
              </Link>
              <Link to="/student/connections" className="block">
                <Button variant="outline" className="w-full justify-start hover:bg-primary hover:text-primary-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  Find Classmates
                </Button>
              </Link>
              {classes.length > 0 && (
                <Button variant="outline" className="w-full justify-start hover:bg-primary hover:text-primary-foreground" onClick={() => handleDownloadGradeCard(classes[0].classId)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Grade Card
                </Button>
              )}
              <Link to="/student/leaderboard" className="block">
                <Button variant="outline" className="w-full justify-start hover:bg-primary hover:text-primary-foreground">
                  <Award className="mr-2 h-4 w-4" />
                  View Leaderboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
