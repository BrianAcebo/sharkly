import { supabase } from '../utils/supabaseClient';

export const useSupabase = () => {
	return {
		supabase
	};
};

export default useSupabase;
