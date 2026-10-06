# 🏥 Hospital Resource Allocation System (MediFlow)

A web application that helps a **single hospital** manage and allocate its limited resources (beds, staff, and equipment) quickly and fairly, based on patient priority.

🔗 **Live Demo:** https://hospital-resource-allocationtool.lovable.app/

---

## 📌 Problem Statement

Hospitals often struggle to use limited resources efficiently. Beds fill up, staff get overloaded, and critical equipment like ventilators and oxygen is hard to track in real time. Manual allocation causes delays, especially in emergencies.

## 💡 Our Solution

This system gives hospital administrators one dashboard to track every resource and a **smart allocation engine** that recommends the best bed, ward, and doctor for each patient using a transparent priority score.

> This project manages resources **inside one hospital**. It does not handle multiple hospitals.

---

## ✨ Features

- **Dashboard**: live KPIs (bed occupancy, free ICU beds, ventilators, staff on duty, patients waiting), charts, and alerts
- **Beds & Wards**: color-coded bed status (free / occupied / cleaning) across wards such as General, ICU, Emergency, Maternity, and Pediatrics
- **Patient Management**: admit and discharge patients, with search and filters; discharge frees linked resources
- **Smart Allocation Engine**: recommends a bed, ward, and doctor using a priority score with a visible breakdown, plus an auto-sorted waiting queue
- **Staff Management**: doctors and nurses with shifts, specialization, and current workload
- **Equipment & Inventory**: ventilators, oxygen cylinders, OT rooms, blood units, and medicines, with low-stock warnings and restock
- **Emergency Mode**: prioritizes critical patients and highlights available ICU beds and ventilators
- **Reports**: utilization summary with CSV download

---

## 🧠 How the Allocation Works

When a patient is admitted, the system calculates a priority score from:

1. **Severity** of the patient's condition
2. **Waiting time** in the queue
3. **Resources needed** (ICU bed, ventilator, oxygen, OT)
4. **Availability** of beds, equipment, and staff

The patient with the highest score is served first, and the system recommends the best available bed and the least-loaded suitable doctor. An administrator approves the allocation with one click.

---

## 🛠️ Tech Stack

- React + Vite
- Tailwind CSS + shadcn/ui
- Recharts (charts)
- Browser localStorage (no backend; uses demo data)

---

## 🚀 Run Locally

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <your-repo-folder>

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open the local address shown in the terminal (usually `http://localhost:5173`).

To create a production build:

```bash
npm run build
```

---

## 🎬 Quick Demo Flow

1. Open the **Dashboard** and review the current resource status.
2. Go to **Patients** and admit a new patient with a severity level.
3. Open the **Allocation** view, check the score breakdown, and approve the recommendation.
4. See the bed and dashboard numbers update.
5. Discharge the patient and watch the resources become free again.
6. Turn on **Emergency Mode** to see critical patients prioritized.

---

## 📷 Screenshots

_Add screenshots here (Dashboard, Beds & Wards, Allocation)._

---

## 🔮 Future Improvements

- Real database and user login for hospital staff
- Predicting bed demand from admission trends
- SMS or email alerts for critical shortages
- Role-based access (admin, doctor, nurse)

---

## 👥 Team

- _Add team member names here_

---

## 📄 Note

This is a prototype built for a hackathon. All patient, staff, and inventory data is sample data for demonstration only.
