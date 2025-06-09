import { SignIn } from "@clerk/nextjs";
import { dark } from '@clerk/themes';
// We no longer need the custom CSS file
// import '@/styles/custom-sign-in.css'; 

export default function SignInPage() {
  return (
    // Main container
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      
      {/* Logo at the top */}
      <div className="flex justify-center pt-8 pb-4">
        <img src="/logo.png" alt="Coaching Companion Logo" className="w-24 h-auto" />
      </div>

      {/* Sign-in modal container with enforced padding */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full px-4 sm:px-6 md:px-8">
          <div className="w-full max-w-md mx-auto">
            <SignIn
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: '#7c3aed', 
                },
                elements: {
                  card: 'shadow-xl w-full', 
                  formButtonPrimary: 
                    'text-sm font-semibold normal-case tracking-wide', 
                  footerActionLink: 'text-purple-400 hover:text-purple-500', 
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Bottom padding for mobile */}
      <div className="pb-4"></div>
    </div>
  );
} 