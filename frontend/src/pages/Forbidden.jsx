import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="py-20 flex flex-col items-center text-center">
      <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5"><ShieldAlert className="h-8 w-8" /></div>
      <h1 className="text-2xl font-extrabold text-slate-900">You don't have permission</h1>
      <p className="text-slate-500 mt-2 max-w-md">This page is only available to the shop owner. Please ask the owner if you need access.</p>
      <Button onClick={() => navigate('/')} className="mt-6 bg-orange-500 hover:bg-orange-600 text-white">Back to Dashboard</Button>
    </div>
  );
}
