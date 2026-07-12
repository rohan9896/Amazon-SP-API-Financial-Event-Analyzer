import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { FinancesPage } from '@/pages/FinancesPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { ReconciliationPage } from '@/pages/ReconciliationPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="finances" element={<FinancesPage />} />
          <Route path="reconciliation" element={<ReconciliationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
