-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete predictions
CREATE POLICY "Admins can delete predictions"
ON public.predictions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete login history
CREATE POLICY "Admins can delete login history"
ON public.login_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));