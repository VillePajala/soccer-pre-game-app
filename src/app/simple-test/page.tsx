export default function SimpleTestPage() {
  // Check env var at build time
  const enableSupabase = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Environment Test</h1>
      <div className="space-y-2">
        <p>NEXT_PUBLIC_ENABLE_SUPABASE = <code className="bg-gray-100 px-2 py-1 rounded">{enableSupabase || 'undefined'}</code></p>
        <p>Type: <code className="bg-gray-100 px-2 py-1 rounded">{typeof enableSupabase}</code></p>
        <p>Should show auth: <code className="bg-gray-100 px-2 py-1 rounded">{enableSupabase === 'true' ? 'YES' : 'NO'}</code></p>
        
        {enableSupabase === 'true' && (
          <div className="mt-4 p-4 bg-green-100 rounded">
            ✅ Environment variable is correctly set to "true"
          </div>
        )}
        
        {!enableSupabase && (
          <div className="mt-4 p-4 bg-red-100 rounded">
            ❌ Environment variable is not set in Vercel
          </div>
        )}
        
        {enableSupabase && enableSupabase !== 'true' && (
          <div className="mt-4 p-4 bg-yellow-100 rounded">
            ⚠️ Environment variable is set to "{enableSupabase}" but needs to be exactly "true"
          </div>
        )}
      </div>
    </div>
  );
}