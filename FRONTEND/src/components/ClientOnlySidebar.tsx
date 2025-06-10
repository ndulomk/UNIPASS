// components/ClientOnlySidebar.tsx
import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface ClientOnlySidebarProps {
  studentName?: string;
  courseName?: string;
}

const ClientOnlySidebar = ({ studentName, courseName }: ClientOnlySidebarProps) => {
  const [StudentSidebar, setStudentSidebar] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSidebar = async () => {
      try {
        const { default: SidebarComponent } = await import('./StudentSidebar');
        setStudentSidebar(() => SidebarComponent);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading sidebar:', error);
      }
    };

    loadSidebar();
  }, []);

  // Loading skeleton
  if (!isLoaded || !StudentSidebar) {
    return (
      <aside className="w-72 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-6 flex flex-col fixed h-full shadow-2xl">
        <div className="mb-10 text-center animate-pulse">
          <div className="mx-auto w-24 h-24 rounded-full bg-slate-700 mb-3"></div>
          <div className="h-5 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto"></div>
        </div>
        
        <nav className="flex-grow space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3 px-4 py-3 animate-pulse">
              <div className="w-5 h-5 bg-slate-700 rounded"></div>
              <div className="h-4 bg-slate-700 rounded flex-1"></div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-700">
          <div className="flex items-center space-x-3 px-4 py-3 animate-pulse">
            <div className="w-5 h-5 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded w-16"></div>
          </div>
        </div>
      </aside>
    );
  }

  return <StudentSidebar studentName={studentName} courseName={courseName} />;
};

export default ClientOnlySidebar;