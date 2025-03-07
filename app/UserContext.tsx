import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Ticket } from './types'; // Import the User interface

// Define the URLs for both user and ticket data
const APP_SCRIPT_USER_URL = "https://script.google.com/macros/s/AKfycbwXIfuadHykMFrMdPPLLP7y0pm4oZ8TJUnM9SMmDp9BkaVLGu9jupU-CuW8Id-Mm1ylxg/exec?sheetname=user";
const APP_SCRIPT_TICKET_URL = "https://script.google.com/macros/s/AKfycbwXIfuadHykMFrMdPPLLP7y0pm4oZ8TJUnM9SMmDp9BkaVLGu9jupU-CuW8Id-Mm1ylxg/exec?sheetname=ticket";


interface UserContextProps {
  user: User | null;
  users: User[];
  ticket: Ticket | null;
  tickets: Ticket[];
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  fetchAllUsers: () => Promise<void>;
  fetchAllTickets: () => Promise<void>;
}

const UserContext = createContext<UserContextProps>({
  user: null,
  users: [],
  ticket: null,
  tickets: [],
  loading: true,
  setUser: () => {},
  setUsers: () => {},
  setTicket: () => {},
  setTickets: () => {},
  fetchAllUsers: async () => {},
  fetchAllTickets: async () => {}
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch user data by userId
  const fetchUserData = async (id: string) => {
    try {
      const response = await fetch(APP_SCRIPT_USER_URL);
      const data: User[] = await response.json();
      const userData = data.find((row: User) => row.userId === id);
      if (userData) {
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData)); // Cache user data
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users
  const fetchAllUsers = async () => {
    try {
      const response = await fetch(APP_SCRIPT_USER_URL);
      const data: User[] = await response.json();
      setUsers(data);
      localStorage.setItem('allUsersData', JSON.stringify(data)); // Cache all users data
    } catch (error) {
      console.error('Error fetching all users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch ticket data by ticketId
  const fetchTicketData = async (ticketId: string) => {
    try {
      const response = await fetch(APP_SCRIPT_TICKET_URL);
      const data: Ticket[] = await response.json();
      const ticketData = data.find((row: Ticket) => row.ticketId === ticketId);
      if (ticketData) {
        setTicket(ticketData);
        localStorage.setItem('ticketData', JSON.stringify(ticketData)); // Cache ticket data
      }
    } catch (error) {
      console.error('Error fetching ticket data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all tickets
  const fetchAllTickets = async () => {
    try {
      const response = await fetch(APP_SCRIPT_TICKET_URL);
      const data: Ticket[] = await response.json();
      setTickets(data);
      localStorage.setItem('allTicketsData', JSON.stringify(data)); // Cache all tickets data
    } catch (error) {
      console.error('Error fetching all tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect hook to handle fetching based on URL parameters and cache
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    const ticketIdFromUrl = searchParams.get('ticketId');  // Fetch ticketId from URL if available
    const cachedId = localStorage.getItem('userId');
    const cachedUserData = localStorage.getItem('userData');
    const cachedAllUsersData = localStorage.getItem('allUsersData');
    const cachedTicketData = localStorage.getItem('ticketData');
    const cachedAllTicketsData = localStorage.getItem('allTicketsData');
    const currentPath = window.location.pathname;

    if (cachedUserData) {
      try {
        setUser(JSON.parse(cachedUserData));
      } catch (e) {
        console.error("Error parsing cached user data", e);
        localStorage.removeItem('userData');
      }
    }

    if (cachedAllUsersData) {
      try {
        setUsers(JSON.parse(cachedAllUsersData));
      } catch (e) {
        console.error("Error parsing cached all users data", e);
        localStorage.removeItem('allUsersData');
      }
    }

    if (cachedTicketData) {
      try {
        setTicket(JSON.parse(cachedTicketData));
      } catch (e) {
        console.error("Error parsing cached ticket data", e);
        localStorage.removeItem('ticketData');
      }
    }

    if (cachedAllTicketsData) {
      try {
        setTickets(JSON.parse(cachedAllTicketsData));
      } catch (e) {
        console.error("Error parsing cached all tickets data", e);
        localStorage.removeItem('allTicketsData');
      }
    }

    if (idFromUrl) {
      localStorage.setItem('userId', idFromUrl);
      fetchUserData(idFromUrl);
    } else if (cachedId) {
      fetchUserData(cachedId);
    } else if (!currentPath.startsWith('/admin')) {
      router.push('/invalid');
      setLoading(false);
    } else {
      setLoading(false);
    }

    if (ticketIdFromUrl) {
      fetchTicketData(ticketIdFromUrl);  // Fetch the specific ticket based on URL parameter
    }

    const interval = setInterval(() => {
      const id = searchParams.get('id') || localStorage.getItem('userId');
      if (id) {
        fetchUserData(id);
      }
      fetchAllUsers(); // Refresh all users data periodically
      fetchAllTickets(); // Refresh all tickets data periodically
    }, 2000); // Poll every 2 seconds (adjust as needed)

    return () => clearInterval(interval);
  }, [searchParams, router]);

  return (
    <UserContext.Provider
      value={{
        user,
        users,
        ticket,
        tickets,
        loading,
        setUser,
        setUsers,
        setTicket,
        setTickets,
        fetchAllUsers,
        fetchAllTickets,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
