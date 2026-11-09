// Import đầu tiên trong main.tsx: đổi dữ liệu localStorage cũ trước khi các store (progress, notebooks…) đọc nó.
import { runMigrations } from './migrations'

runMigrations()
