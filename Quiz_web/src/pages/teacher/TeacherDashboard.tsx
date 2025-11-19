import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, FileCheck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Quiz, Class, QuizAttempt } from '@/types';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalClasses: 0,
    totalAttempts: 0,
    averageScore: 0
  });
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch quizzes
        const quizzesResponse = await fetch('/api/quizzes', { headers });
        const quizzes = await quizzesResponse.json();

        // Fetch classes
        const classesResponse = await fetch('/api/classes', { headers });
        const classes = await classesResponse.json();

        // Fetch all quiz attempts
        const attemptsResponse = await fetch('/api/attempts', { headers });
        const attempts = await attemptsResponse.json();

        // Filter attempts for teacher's quizzes
        const teacherQuizIds = quizzes.map((q: Quiz) => q.id);
        const teacherAttempts = attempts.filter((a: QuizAttempt) => teacherQuizIds.includes(a.quizId));

        // Calculate average score as percentage
        let totalPercentage = 0;
        let validAttempts = 0;
        teacherAttempts.forEach((a: QuizAttempt) => {
          if (a.totalPoints > 0 && a.score !== null) {
            totalPercentage += (a.score / a.totalPoints) * 100;
            validAttempts++;
          }
        });
        const avgScore = validAttempts > 0 ? totalPercentage / validAttempts : 0;

        setStats({
          totalQuizzes: quizzes.length,
          totalClasses: classes.length,
          totalAttempts: teacherAttempts.length,
          averageScore: Math.round(avgScore)
        });

        // Get recent quizzes
        const sortedQuizzes = [...quizzes].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentQuizzes(sortedQuizzes.slice(0, 5));

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h2>
        <p className="text-muted-foreground">Here's what's happening with your classes today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quizzes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Your recently created quizzes</CardDescription>
            </div>
            <Link to="/teacher/quizzes">
              <Button>View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentQuizzes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No quizzes created yet</p>
              <Link to="/teacher/quizzes">
                <Button className="mt-4">Create Your First Quiz</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{quiz.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {quiz.totalPoints} points • {Number(quiz.isPublished) > 0 ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <Link to={`/teacher/quizzes/${quiz.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Link to="/teacher/quizzes" className="block">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
          <Link to="/teacher/classes" className="block">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Manage Classes
            </Button>
          </Link>
          <Link to="/teacher/analytics" className="block">
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </Link>
          <Link to="/teacher/profile" className="block">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
