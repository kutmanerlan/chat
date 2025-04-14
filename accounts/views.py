from django.contrib.auth.models import User
from django.shortcuts import render, redirect

def register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        # Create user correctly
        user = User.objects.create_user(username=username, email=email, password=password)
        # The create_user method handles password hashing internally
        
        # ... rest of your code (login, redirect, etc.) ...
        
        return redirect('login')  # or wherever you want to redirect after registration
    
    return render(request, 'accounts/register.html')  # your registration template
