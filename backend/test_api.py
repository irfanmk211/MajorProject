import urllib.request, json
boundary = "boundary1"
body = bf"--8{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"test.jpg\"\r\nContent-Type: image/jpeg\r\n\r\nleafdata\r\n--8{boundary}--\r\n"
req = urllib.request.Request("http://127.0.0.1:5000/predict-disease", data=body, headers={"Content-Type": fi"multipart/form-data; boundary=8{boundary}"})
res = urllib.request.urlopen(req)
print(res.read().decode("utf-8"))