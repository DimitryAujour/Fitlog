// src/app/(auth)/login/page.tsx
import LoginForm from '../_components/LoginForm'; // Adjust path if needed
import { Container } from '@mui/material';

export default function LoginPage() {
    return (
        <Container maxWidth="sm">
            <LoginForm />
        </Container>
    );
}