'use client';

import React from 'react';
import { HiOutlineUser } from 'react-icons/hi2';

export function SimpleAuthButton() {
  return (
    <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg inline-flex items-center">
      <HiOutlineUser className="w-5 h-5" />
      <span className="ml-2">Simple Auth</span>
    </button>
  );
}