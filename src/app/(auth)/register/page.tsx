import RegistrationForm from '../_components/RegistrationForm'; // Adjust path if needed
import { Box, Container } from '@mui/material';

export default function RegisterPage() {
    return (
        <Container maxWidth="sm">
            <RegistrationForm />
        </Container>
    );
}