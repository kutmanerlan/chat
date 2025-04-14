# ...existing code...

# Find the part where you create a new user, it probably looks something like this:
# user = User(username=username, password=password, email=email)  # This is the incorrect line

# Replace it with:
user = User(username=username, email=email)  # Remove password from constructor
user.set_password(password)  # Set password properly using this method
user.save()

# ...existing code...
